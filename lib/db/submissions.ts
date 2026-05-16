import type { AiAnalysis, Submission, StoredQuote, SubmissionStatus } from "@/lib/types";
import { getSupabaseAdmin, PDF_BUCKET } from "@/lib/supabase/server";

export type DbQuote = {
  builder: string;
  content: string;
  pdf_path?: string | null;
  pdf_file_name?: string | null;
};

type DbSubmissionRow = {
  id: string;
  project_description: string;
  quotes: DbQuote[];
  status: SubmissionStatus;
  ai_analysis: AiAnalysis | null;
  partner_notes: string;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
};

function rowToSubmission(row: DbSubmissionRow): Submission {
  return {
    id: row.id,
    projectDescription: row.project_description,
    quotes: (row.quotes ?? []).map(
      (q): StoredQuote => ({
        builder: q.builder,
        content: q.content ?? "",
        pdfFileName: q.pdf_file_name ?? null,
      }),
    ),
    status: row.status,
    aiAnalysis: row.ai_analysis,
    partnerNotes: row.partner_notes ?? "",
    createdAt: row.created_at,
    errorCode: row.error_code ?? undefined,
    errorMessage: row.error_message ?? undefined,
  };
}

export function pdfStoragePath(submissionId: string, index: number): string {
  return `${submissionId}/quote_${index}.pdf`;
}

export async function createSubmission(input: {
  projectDescription: string;
  quotes: DbQuote[];
}): Promise<Submission> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("submissions")
    .insert({
      project_description: input.projectDescription,
      quotes: input.quotes,
      status: "analysing",
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create submission");
  }

  return rowToSubmission(data as DbSubmissionRow);
}

export async function updateSubmissionQuotes(id: string, quotes: DbQuote[]): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("submissions").update({ quotes }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateSubmissionSuccess(id: string, analysis: AiAnalysis): Promise<Submission> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("submissions")
    .update({
      status: "ready",
      ai_analysis: analysis,
      error_code: null,
      error_message: null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update submission");
  }

  return rowToSubmission(data as DbSubmissionRow);
}

export async function updateSubmissionError(
  id: string,
  errorCode: string,
  errorMessage: string,
): Promise<Submission> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("submissions")
    .update({
      status: "error",
      error_code: errorCode,
      error_message: errorMessage,
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update submission");
  }

  return rowToSubmission(data as DbSubmissionRow);
}

export async function patchSubmission(
  id: string,
  patch: { partnerNotes?: string; status?: SubmissionStatus },
): Promise<Submission> {
  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = {};
  if (patch.partnerNotes !== undefined) update.partner_notes = patch.partnerNotes;
  if (patch.status !== undefined) update.status = patch.status;

  const { data, error } = await supabase.from("submissions").update(update).eq("id", id).select().single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to patch submission");
  }

  return rowToSubmission(data as DbSubmissionRow);
}

export async function listSubmissions(): Promise<Submission[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("submissions")
    .select()
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToSubmission(row as DbSubmissionRow));
}

export async function getSubmission(id: string): Promise<Submission | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("submissions").select().eq("id", id).maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToSubmission(data as DbSubmissionRow);
}

export async function getQuotePdfPath(submissionId: string, index: number): Promise<string | null> {
  const submission = await getSubmission(submissionId);
  if (!submission) return null;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("submissions").select("quotes").eq("id", submissionId).single();
  const quotes = (data?.quotes ?? []) as DbQuote[];
  const quote = quotes[index];
  return quote?.pdf_path ?? null;
}

export async function uploadQuotePdf(
  submissionId: string,
  index: number,
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const path = pdfStoragePath(submissionId, index);

  const { error } = await supabase.storage.from(PDF_BUCKET).upload(path, buffer, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (error) throw new Error(error.message);
  return path;
}

export async function downloadQuotePdf(path: string): Promise<{ data: Blob; fileName: string }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(PDF_BUCKET).download(path);

  if (error || !data) {
    throw new Error(error?.message ?? "PDF not found");
  }

  const segments = path.split("/");
  const fileName = segments[segments.length - 1] ?? "quote.pdf";
  return { data, fileName };
}
