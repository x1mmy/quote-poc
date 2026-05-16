"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import type { AnalyseApiError, AnalyseApiSuccess, Submission, StoredQuote, SubmissionsListResponse } from "@/lib/types";
import { Header } from "@/components/Header";
import { CustomerView } from "@/components/CustomerView";
import { PartnerView } from "@/components/PartnerView";
import { AnalysingOverlay } from "@/components/AnalysingOverlay";
import { fonts, palette } from "@/components/style";

async function loadSubmissionsFromApi(): Promise<Submission[]> {
  const res = await fetch("/api/submissions");
  if (!res.ok) return [];
  const data = (await res.json()) as SubmissionsListResponse;
  return data.submissions ?? [];
}

export function App() {
  const [view, setView] = useState<"customer" | "partner">("customer");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [partnerSelectedId, setPartnerSelectedId] = useState<string | null>(null);
  const [customerFocusId, setCustomerFocusId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await loadSubmissionsFromApi();
        if (!cancelled) setSubmissions(list);
      } catch {
        if (!cancelled) toast.error("Could not load saved submissions");
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const showAnalysingOverlay = useMemo(() => {
    if (view !== "partner" || !customerFocusId) return false;
    const s = submissions.find((x) => x.id === customerFocusId);
    return s?.status === "analysing";
  }, [view, customerFocusId, submissions]);

  const persistSubmission = useCallback(async (updated: Submission) => {
    const res = await fetch(`/api/submissions/${updated.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerNotes: updated.partnerNotes,
        status: updated.status,
      }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(err.message ?? "Failed to save");
    }

    const data = (await res.json()) as { submission: Submission };
    setSubmissions((subs) => subs.map((x) => (x.id === data.submission.id ? data.submission : x)));
    return data.submission;
  }, []);

  const startSubmission = useCallback(
    async (payload: {
      project: string;
      rows: { builder: string; text: string }[];
      pdfs: (File | null)[];
    }) => {
      const { project, rows, pdfs } = payload;
      const tempId = "temp_" + Math.random().toString(36).slice(2, 12);
      const quotesMeta: StoredQuote[] = rows.map((r, i) => ({
        builder: r.builder,
        content: r.text,
        pdfFileName: pdfs[i]?.name ?? null,
      }));

      const newSub: Submission = {
        id: tempId,
        projectDescription: project,
        quotes: quotesMeta,
        status: "analysing",
        aiAnalysis: null,
        partnerNotes: "",
        createdAt: new Date().toISOString(),
      };

      setSubmissions((s) => [newSub, ...s]);
      setPartnerSelectedId(tempId);
      setCustomerFocusId(tempId);
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

      const replaceId = (fromId: string, next: Submission) => {
        setSubmissions((subs) => subs.map((x) => (x.id === fromId ? next : x)));
        setPartnerSelectedId((id) => (id === fromId ? next.id : id));
        setCustomerFocusId((id) => (id === fromId ? next.id : id));
      };

      try {
        const res = await fetch("/api/analyse", { method: "POST", body: formData });
        const data = (await res.json()) as AnalyseApiSuccess & AnalyseApiError;

        if (!res.ok) {
          const err = data;
          const msg = err.message || err.error || "Request failed";
          const dbId = err.submissionId;

          if (dbId) {
            const list = await loadSubmissionsFromApi();
            const fromDb = list.find((s) => s.id === dbId);
            if (fromDb) replaceId(tempId, fromDb);
            else replaceId(tempId, { ...newSub, id: dbId, status: "error", errorCode: err.error, errorMessage: msg });
          } else {
            setSubmissions((subs) =>
              subs.map((x) =>
                x.id === tempId ? { ...x, status: "error", errorCode: err.error, errorMessage: msg } : x,
              ),
            );
          }

          if (res.status === 429 || err.error === "GEMINI_QUOTA") {
            toast.error("Gemini quota / rate limit", { description: msg, duration: 12_000 });
          } else {
            toast.error("Analysis failed", { description: msg });
          }
          return;
        }

        if (!data.analysis || !data.submissionId) {
          setSubmissions((subs) =>
            subs.map((x) =>
              x.id === tempId
                ? { ...x, status: "error", errorCode: "NO_ANALYSIS", errorMessage: "Empty analysis in response" }
                : x,
            ),
          );
          toast.error("Analysis failed", { description: "Empty analysis in response" });
          return;
        }

        replaceId(tempId, {
          id: data.submissionId,
          projectDescription: project,
          quotes: quotesMeta,
          status: "ready",
          aiAnalysis: data.analysis,
          partnerNotes: "",
          createdAt: newSub.createdAt,
        });

        const list = await loadSubmissionsFromApi();
        const fromDb = list.find((s) => s.id === data.submissionId);
        if (fromDb) {
          setSubmissions((subs) => subs.map((x) => (x.id === data.submissionId ? fromDb : x)));
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Network error";
        setSubmissions((subs) =>
          subs.map((x) =>
            x.id === tempId ? { ...x, status: "error", errorCode: "NETWORK", errorMessage: msg } : x,
          ),
        );
        toast.error("Network error", { description: msg });
      }
    },
    [],
  );

  if (!hydrated) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg, fontFamily: fonts.body, color: palette.ink }}>
        <div style={{ padding: 48, textAlign: "center", color: palette.inkFaint, fontSize: 14 }}>Loading submissions…</div>
      </div>
    );
  }

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
          onPersistSubmission={persistSubmission}
          onApproved={() => {}}
        />
      )}
    </div>
  );
}
