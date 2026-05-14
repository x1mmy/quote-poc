"use client";

import { useCallback, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import type { AiAnalysis, AnalyseApiError, Submission, StoredQuote } from "@/lib/types";
import { Header } from "@/components/Header";
import { CustomerView } from "@/components/CustomerView";
import { PartnerView } from "@/components/PartnerView";
import { AnalysingOverlay } from "@/components/AnalysingOverlay";
import { fonts, palette } from "@/components/style";

export function App() {
  const [view, setView] = useState<"customer" | "partner">("customer");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [partnerSelectedId, setPartnerSelectedId] = useState<string | null>(null);
  const [customerFocusId, setCustomerFocusId] = useState<string | null>(null);

  const showAnalysingOverlay = useMemo(() => {
    if (view !== "partner" || !customerFocusId) return false;
    const s = submissions.find((x) => x.id === customerFocusId);
    return s?.status === "analysing";
  }, [view, customerFocusId, submissions]);

  const startSubmission = useCallback(
    async (payload: {
      project: string;
      rows: { builder: string; text: string }[];
      pdfs: (File | null)[];
    }) => {
      const { project, rows, pdfs } = payload;
      const id = "sub_" + Math.random().toString(36).slice(2, 12);
      const quotesMeta: StoredQuote[] = rows.map((r, i) => ({
        builder: r.builder,
        content: r.text,
        pdfFileName: pdfs[i]?.name ?? null,
      }));

      const newSub: Submission = {
        id,
        projectDescription: project,
        quotes: quotesMeta,
        status: "analysing",
        aiAnalysis: null,
        partnerNotes: "",
        createdAt: new Date().toISOString(),
      };

      setSubmissions((s) => [newSub, ...s]);
      setPartnerSelectedId(id);
      setCustomerFocusId(id);
      setView("partner");

      toast.info("Analysis started", {
        description: "Partner view is open — watch Gemini work through your quotes here.",
      });

      const formData = new FormData();
      formData.append("project", project);
      for (let i = 0; i < 3; i++) {
        formData.append(`quote_${i}_builder`, rows[i].builder);
        formData.append(`quote_${i}_text`, rows[i].text);
        const file = pdfs[i];
        if (file) formData.append(`quote_${i}_pdf`, file);
      }

      try {
        const res = await fetch("/api/analyse", { method: "POST", body: formData });
        const data = (await res.json()) as ({ analysis?: AiAnalysis } & AnalyseApiError) | AnalyseApiError;

        if (!res.ok) {
          const err = data as AnalyseApiError;
          const msg = err.message || err.error || "Request failed";
          setSubmissions((subs) =>
            subs.map((x) =>
              x.id === id ? { ...x, status: "error", errorCode: err.error, errorMessage: msg } : x,
            ),
          );
          if (res.status === 429 || err.error === "GEMINI_QUOTA") {
            toast.error("Gemini quota / rate limit", { description: msg, duration: 12_000 });
          } else {
            toast.error("Analysis failed", { description: msg });
          }
          return;
        }

        const ok = data as { analysis?: AiAnalysis };
        if (!ok.analysis) {
          setSubmissions((subs) =>
            subs.map((x) =>
              x.id === id
                ? { ...x, status: "error", errorCode: "NO_ANALYSIS", errorMessage: "Empty analysis in response" }
                : x,
            ),
          );
          toast.error("Analysis failed", { description: "Empty analysis in response" });
          return;
        }

        setSubmissions((subs) =>
          subs.map((x) => (x.id === id ? { ...x, status: "ready", aiAnalysis: ok.analysis! } : x)),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Network error";
        setSubmissions((subs) =>
          subs.map((x) =>
            x.id === id ? { ...x, status: "error", errorCode: "NETWORK", errorMessage: msg } : x,
          ),
        );
        toast.error("Network error", { description: msg });
      }
    },
    [],
  );

  return (
    <div style={{ minHeight: "100vh", background: palette.bg, fontFamily: fonts.body, color: palette.ink }}>
      <Toaster richColors position="top-center" />
      {showAnalysingOverlay ? <AnalysingOverlay /> : null}
      <style>{`
        * { box-sizing: border-box; }
        textarea:focus, input:focus { outline: none; border-color: ${palette.accent}; }
        button:hover:not(:disabled) { opacity: 0.92; }
      `}</style>
      <Header view={view} setView={setView} />
      {view === "customer" ? (
        <CustomerView
          submissions={submissions}
          focusSubmissionId={customerFocusId}
          onClearFocus={() => setCustomerFocusId(null)}
          onStartSubmission={startSubmission}
        />
      ) : (
        <PartnerView
          submissions={submissions}
          setSubmissions={setSubmissions}
          selectedId={partnerSelectedId}
          setSelectedId={setPartnerSelectedId}
          onApproved={() => {}}
        />
      )}
    </div>
  );
}
