import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Part } from "@google/generative-ai";
import {
  createSubmission,
  updateSubmissionError,
  updateSubmissionQuotes,
  updateSubmissionSuccess,
  uploadQuotePdf,
  type DbQuote,
} from "@/lib/db/submissions";
import { buildInitialPromptText } from "@/lib/geminiPrompt";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { AiAnalysis, AnalyseApiError, AnalyseApiSuccess } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_PDF_BYTES = 12 * 1024 * 1024;
/** 2.0 Flash free tier is often exhausted (`limit: 0`); 2.5 Flash is the current default in Gemini docs. */
const DEFAULT_MODEL = "gemini-2.5-flash";

type ParsedQuote = {
  builder: string;
  text: string;
  pdfBuffer?: Buffer;
  pdfFileName?: string;
  pdfBase64?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryDelayMs(message: string): number | null {
  const m = message.match(/Please retry in ([\d.]+)s/i);
  if (m) return Math.min(Math.ceil(parseFloat(m[1]) * 1000) + 750, 120_000);
  return null;
}

function isTransientGeminiError(message: string): boolean {
  return (
    message.includes("429") ||
    message.includes("Too Many Requests") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("503") ||
    /UNAVAILABLE|overloaded|EAI_AGAIN/i.test(message)
  );
}

function isQuotaStyleError(message: string): boolean {
  return (
    message.includes("429") ||
    message.includes("Too Many Requests") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("quota") ||
    message.includes("Quota exceeded")
  );
}

async function generateAnalysisJsonText(apiKey: string, modelName: string, parts: Part[]): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts }],
      });
      return result.response.text();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (attempt < 2 && isTransientGeminiError(msg)) {
        const delay = parseRetryDelayMs(msg) ?? 4000 * (attempt + 1);
        await sleep(delay);
        continue;
      }
      throw e;
    }
  }
  throw new Error("Gemini request failed after retries");
}

function stripJsonFences(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function parseAnalysisText(text: string): AiAnalysis {
  const cleaned = stripJsonFences(text);
  return JSON.parse(cleaned) as AiAnalysis;
}

async function persistSubmissionError(submissionId: string | null, errorCode: string, errorMessage: string) {
  if (!submissionId) return;
  try {
    await updateSubmissionError(submissionId, errorCode, errorMessage);
  } catch {
    // Best-effort persistence; client still receives the API error.
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json(
      {
        error: "MISSING_SUPABASE_CONFIG",
        message: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
      } satisfies AnalyseApiError,
      { status: 500 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error: "MISSING_API_KEY",
        message: "Set GEMINI_API_KEY in .env or .env.local",
      } satisfies AnalyseApiError,
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "BAD_FORM" } satisfies AnalyseApiError, { status: 400 });
  }

  const project = String(formData.get("project") ?? "").trim();
  if (!project) {
    return Response.json({ error: "MISSING_PROJECT" } satisfies AnalyseApiError, { status: 400 });
  }

  const quotes: ParsedQuote[] = [];

  for (let i = 0; i < 3; i++) {
    const builder = String(formData.get(`quote_${i}_builder`) ?? "").trim();
    const text = String(formData.get(`quote_${i}_text`) ?? "").trim();
    const pdf = formData.get(`quote_${i}_pdf`);

    let pdfBuffer: Buffer | undefined;
    let pdfFileName: string | undefined;
    let pdfBase64: string | undefined;

    if (pdf instanceof File && pdf.size > 0) {
      if (pdf.type && pdf.type !== "application/pdf") {
        return Response.json(
          { error: "INVALID_PDF_TYPE", message: "Only application/pdf is supported", index: i } satisfies AnalyseApiError,
          { status: 400 },
        );
      }
      pdfBuffer = Buffer.from(await pdf.arrayBuffer());
      if (pdfBuffer.byteLength > MAX_PDF_BYTES) {
        return Response.json(
          {
            error: "PDF_TOO_LARGE",
            message: `Quote ${i + 1} PDF exceeds ${MAX_PDF_BYTES / (1024 * 1024)}MB`,
            index: i,
            maxMb: MAX_PDF_BYTES / (1024 * 1024),
          } satisfies AnalyseApiError,
          { status: 413 },
        );
      }
      pdfBase64 = pdfBuffer.toString("base64");
      pdfFileName = pdf.name;
    }

    if (!builder) {
      return Response.json({ error: "MISSING_BUILDER", index: i } satisfies AnalyseApiError, { status: 400 });
    }
    if (!text && !pdfBase64) {
      return Response.json(
        { error: "MISSING_QUOTE_CONTENT", message: "Each quote needs pasted text and/or a PDF", index: i } satisfies AnalyseApiError,
        { status: 400 },
      );
    }

    quotes.push({ builder, text, pdfBuffer, pdfFileName, pdfBase64 });
  }

  let submissionId: string | null = null;

  try {
    const initialDbQuotes: DbQuote[] = quotes.map((q) => ({
      builder: q.builder,
      content: q.text,
      pdf_path: null,
      pdf_file_name: q.pdfFileName ?? null,
    }));

    const created = await createSubmission({
      projectDescription: project,
      quotes: initialDbQuotes,
    });
    submissionId = created.id;

    const dbQuotesWithPaths: DbQuote[] = [...initialDbQuotes];
    for (let i = 0; i < quotes.length; i++) {
      const q = quotes[i];
      if (q.pdfBuffer) {
        const path = await uploadQuotePdf(submissionId, i, q.pdfBuffer, q.pdfFileName ?? `quote_${i}.pdf`);
        dbQuotesWithPaths[i] = {
          ...dbQuotesWithPaths[i],
          pdf_path: path,
          pdf_file_name: q.pdfFileName ?? null,
        };
      }
    }
    await updateSubmissionQuotes(submissionId, dbQuotesWithPaths);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return Response.json(
      { error: "DATABASE_FAILED", message } satisfies AnalyseApiError,
      { status: 500 },
    );
  }

  const modelName = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const parts: Part[] = [{ text: buildInitialPromptText(project) }];

  for (let i = 0; i < quotes.length; i++) {
    const q = quotes[i];
    let header = `\n--- QUOTE ${i + 1}: ${q.builder} ---`;
    if (q.pdfFileName) header += `\nPDF filename: ${q.pdfFileName}`;
    parts.push({ text: `${header}\n` });

    if (q.text.trim()) {
      parts.push({ text: `${q.text}\n` });
    } else if (q.pdfBase64) {
      parts.push({ text: "(Primary quote content is in the attached PDF.)\n" });
    }

    if (q.pdfBase64) {
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: q.pdfBase64,
        },
      });
    }
  }

  try {
    const text = await generateAnalysisJsonText(apiKey, modelName, parts);
    try {
      const analysis = parseAnalysisText(text);
      await updateSubmissionSuccess(submissionId, analysis);
      return Response.json({ submissionId, analysis } satisfies AnalyseApiSuccess);
    } catch {
      const message = "The model returned JSON that could not be parsed";
      await persistSubmissionError(submissionId, "MALFORMED_JSON", message);
      return Response.json(
        {
          error: "MALFORMED_JSON",
          message,
          rawSnippet: text.slice(0, 800),
          submissionId,
        } satisfies AnalyseApiError,
        { status: 502 },
      );
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const retryMs = parseRetryDelayMs(message);
    const retryAfterSeconds = retryMs ? Math.ceil(retryMs / 1000) : undefined;

    if (isQuotaStyleError(message)) {
      const short =
        "Gemini rate limit or free-tier quota was hit for this project/model. " +
        `Try again in ~${retryAfterSeconds ?? 30}s, set GEMINI_MODEL in .env (e.g. gemini-2.5-flash-lite or gemini-1.5-flash), or enable billing in Google AI Studio.`;
      await persistSubmissionError(submissionId, "GEMINI_QUOTA", short);
      return Response.json(
        {
          error: "GEMINI_QUOTA",
          message: short,
          retryAfterSeconds,
          submissionId,
        } satisfies AnalyseApiError,
        {
          status: 429,
          headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined,
        },
      );
    }

    await persistSubmissionError(submissionId, "GEMINI_FAILED", message);
    return Response.json(
      { error: "GEMINI_FAILED", message, submissionId } satisfies AnalyseApiError,
      { status: 502 },
    );
  }
}
