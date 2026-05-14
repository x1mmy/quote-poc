"use client";

import { useState } from "react";
import type { Submission } from "@/lib/types";
import { SAMPLE_PROJECT, SAMPLE_QUOTES } from "@/lib/sampleData";
import { fonts, palette } from "@/components/style";
import { Pill } from "@/components/Pill";
import { Button } from "@/components/Button";
import { AnalysisView } from "@/components/AnalysisView";

function ApprovedReport({ submission }: { submission: Submission }) {
  return (
    <div
      style={{
        marginTop: 32,
        padding: 24,
        background: palette.bg,
        borderRadius: 4,
        border: `1px solid ${palette.line}`,
        textAlign: "left",
      }}
    >
      <h4 style={{ fontFamily: fonts.display, fontSize: 18, margin: "0 0 12px", color: palette.ink }}>Reviewer notes</h4>
      <p style={{ fontFamily: fonts.body, fontSize: 14, color: palette.ink, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
        {submission.partnerNotes}
      </p>
    </div>
  );
}

export function CustomerView({
  submissions,
  focusSubmissionId,
  onClearFocus,
  onStartSubmission,
}: {
  submissions: Submission[];
  focusSubmissionId: string | null;
  onClearFocus: () => void;
  onStartSubmission: (payload: {
    project: string;
    rows: { builder: string; text: string }[];
    pdfs: (File | null)[];
  }) => Promise<void>;
}) {
  const [project, setProject] = useState("");
  const [quotes, setQuotes] = useState([
    { builder: "", content: "" },
    { builder: "", content: "" },
    { builder: "", content: "" },
  ]);
  const [pdfs, setPdfs] = useState<(File | null)[]>([null, null, null]);
  const [fileResetKey, setFileResetKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const tracked = focusSubmissionId ? submissions.find((s) => s.id === focusSubmissionId) : null;

  const loadSample = () => {
    setProject(SAMPLE_PROJECT);
    setQuotes(SAMPLE_QUOTES.map((q) => ({ builder: q.builder, content: q.content })));
    setPdfs([null, null, null]);
    setFileResetKey((k) => k + 1);
  };

  const canSubmit =
    project.trim() &&
    quotes.every((q, i) => {
      if (!q.builder.trim()) return false;
      return Boolean(q.content.trim() || pdfs[i]);
    });

  const submit = async () => {
    setSubmitting(true);
    try {
      await onStartSubmission({
        project: project.trim(),
        rows: quotes.map((q) => ({ builder: q.builder.trim(), text: q.content })),
        pdfs,
      });
    } catch (e) {
      alert("Something went wrong: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setProject("");
    setQuotes([
      { builder: "", content: "" },
      { builder: "", content: "" },
      { builder: "", content: "" },
    ]);
    setPdfs([null, null, null]);
    setFileResetKey((k) => k + 1);
    onClearFocus();
  };

  if (tracked) {
    if (tracked.status === "analysing") {
      return (
        <div style={{ maxWidth: 720, margin: "60px auto", padding: "0 36px" }}>
          <div
            style={{
              background: palette.card,
              padding: 48,
              borderRadius: 6,
              border: `1px solid ${palette.line}`,
              textAlign: "center",
            }}
          >
            <Pill tone="warn">Analysis in progress</Pill>
            <h2
              style={{
                fontFamily: fonts.display,
                fontSize: 28,
                fontWeight: 400,
                color: palette.ink,
                margin: "20px 0 12px",
                letterSpacing: -0.3,
              }}
            >
              We&apos;re on your quotes now.
            </h2>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: 15,
                color: palette.inkSoft,
                lineHeight: 1.6,
                margin: "0 0 24px",
                maxWidth: 480,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Open <strong>Partner view</strong> for the live Gemini breakdown. You can leave this screen — progress
              continues in the background.
            </p>
            <Button variant="ghost" onClick={reset}>
              Start over
            </Button>
          </div>
        </div>
      );
    }

    if (tracked.status === "error") {
      return (
        <div style={{ maxWidth: 720, margin: "60px auto", padding: "0 36px" }}>
          <div
            style={{
              background: palette.dangerSoft,
              padding: 48,
              borderRadius: 6,
              border: `1px solid ${palette.danger}44`,
              textAlign: "center",
            }}
          >
            <h2 style={{ fontFamily: fonts.display, fontSize: 24, color: palette.danger, marginBottom: 12 }}>
              Analysis failed
            </h2>
            <p style={{ fontFamily: fonts.body, fontSize: 14, color: palette.ink, marginBottom: 24 }}>
              {tracked.errorMessage || tracked.errorCode || "Please try again or use pasted text instead of PDF."}
            </p>
            <Button variant="ghost" onClick={reset}>
              Try again
            </Button>
          </div>
        </div>
      );
    }

    const wideReport = tracked.status === "reviewed" && tracked.aiAnalysis;

    return (
      <div style={{ maxWidth: wideReport ? 960 : 720, margin: "60px auto", padding: "0 36px" }}>
        <div
          style={{
            background: palette.card,
            padding: 48,
            borderRadius: 6,
            border: `1px solid ${palette.line}`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: palette.accentSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              color: palette.accent,
              fontSize: 22,
            }}
          >
            ✓
          </div>
          <h2
            style={{
              fontFamily: fonts.display,
              fontSize: 28,
              fontWeight: 400,
              color: palette.ink,
              margin: "0 0 12px",
              letterSpacing: -0.3,
            }}
          >
            Your quotes are in.
          </h2>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: 15,
              color: palette.inkSoft,
              lineHeight: 1.6,
              margin: "0 0 28px",
              maxWidth: 460,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            We&apos;ve run an initial AI breakdown of your three quotes. A licensed reviewer will go over the findings
            and email you within 24 hours.
          </p>
          {tracked.status === "reviewed" && tracked.partnerNotes ? <ApprovedReport submission={tracked} /> : null}
          {tracked.status === "reviewed" && tracked.aiAnalysis ? (
            <div style={{ marginTop: 28, textAlign: "left" }}>
              <h3
                style={{
                  fontFamily: fonts.display,
                  fontSize: 20,
                  fontWeight: 500,
                  color: palette.ink,
                  marginBottom: 16,
                  textAlign: "center",
                }}
              >
                AI breakdown
              </h3>
              <AnalysisView ai={tracked.aiAnalysis} />
            </div>
          ) : null}
          {tracked.status !== "reviewed" ? <Pill tone="warn">Pending partner review</Pill> : null}
          <div style={{ marginTop: 32 }}>
            <Button variant="ghost" onClick={reset}>
              Submit another job
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: "40px auto 80px", padding: "0 36px" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <Pill tone="accent">For homeowners</Pill>
        <h1
          style={{
            fontFamily: fonts.display,
            fontSize: 48,
            fontWeight: 400,
            color: palette.ink,
            margin: "20px 0 16px",
            letterSpacing: -1,
            lineHeight: 1.1,
          }}
        >
          Three quotes. <em>One straight answer.</em>
        </h1>
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: 17,
            color: palette.inkSoft,
            lineHeight: 1.6,
            maxWidth: 560,
            margin: "0 auto",
          }}
        >
          Upload PDFs or paste quote text. We&apos;ll break them down, flag what&apos;s missing, and tell you which one
          is actually the best value.
        </p>
      </div>

      <div
        style={{
          background: palette.card,
          borderRadius: 6,
          border: `1px solid ${palette.line}`,
          padding: 36,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h3 style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 500, color: palette.ink, margin: 0 }}>
            Your project
          </h3>
          <button
            type="button"
            onClick={loadSample}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: fonts.body,
              fontSize: 12,
              color: palette.accent,
              textDecoration: "underline",
              letterSpacing: 0.3,
            }}
          >
            Load sample quotes →
          </button>
        </div>

        <label
          style={{
            display: "block",
            marginBottom: 8,
            fontFamily: fonts.body,
            fontSize: 13,
            color: palette.inkSoft,
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          What are you building?
        </label>
        <textarea
          value={project}
          onChange={(e) => setProject(e.target.value)}
          rows={3}
          placeholder="e.g. Full kitchen renovation in Riverstone, NSW. Approx 12m²..."
          style={{
            width: "100%",
            padding: 14,
            border: `1px solid ${palette.line}`,
            borderRadius: 4,
            fontFamily: fonts.body,
            fontSize: 14,
            color: palette.ink,
            background: palette.bg,
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />

        <h3 style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 500, color: palette.ink, margin: "36px 0 4px" }}>
          The quotes
        </h3>
        <p style={{ fontFamily: fonts.body, fontSize: 13, color: palette.inkSoft, margin: "0 0 20px" }}>
          For each builder: add a PDF <em>or</em> paste text (at least one is required).
        </p>

        {quotes.map((q, i) => (
          <div
            key={i}
            style={{
              marginBottom: 20,
              padding: 20,
              background: palette.bg,
              borderRadius: 4,
              border: `1px solid ${palette.line}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: palette.ink,
                  color: palette.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: fonts.display,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {i + 1}
              </div>
              <input
                value={q.builder}
                onChange={(e) =>
                  setQuotes(quotes.map((qq, j) => (j === i ? { ...qq, builder: e.target.value } : qq)))
                }
                placeholder="Builder name"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  border: `1px solid ${palette.line}`,
                  borderRadius: 4,
                  fontFamily: fonts.body,
                  fontSize: 14,
                  background: palette.card,
                }}
              />
            </div>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontFamily: fonts.body,
                fontSize: 12,
                color: palette.inkSoft,
              }}
            >
              PDF (optional)
            </label>
            <input
              key={`pdf-${fileResetKey}-${i}`}
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setPdfs((prev) => prev.map((p, j) => (j === i ? f : p)));
              }}
              style={{ marginBottom: 12, fontFamily: fonts.body, fontSize: 13 }}
            />
            {pdfs[i] ? (
              <div style={{ fontFamily: fonts.body, fontSize: 12, color: palette.inkSoft, marginBottom: 8 }}>
                Selected: {pdfs[i]?.name}
              </div>
            ) : null}
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontFamily: fonts.body,
                fontSize: 12,
                color: palette.inkSoft,
              }}
            >
              Quote text (optional if PDF attached)
            </label>
            <textarea
              value={q.content}
              onChange={(e) =>
                setQuotes(quotes.map((qq, j) => (j === i ? { ...qq, content: e.target.value } : qq)))
              }
              rows={5}
              placeholder="Paste the full quote text here, or rely on the PDF above…"
              style={{
                width: "100%",
                padding: 12,
                border: `1px solid ${palette.line}`,
                borderRadius: 4,
                fontFamily: fonts.mono,
                fontSize: 12,
                color: palette.ink,
                background: palette.card,
                resize: "vertical",
                boxSizing: "border-box",
                lineHeight: 1.5,
              }}
            />
          </div>
        ))}

        <div style={{ marginTop: 28, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 16 }}>
          {!canSubmit ? (
            <span style={{ fontFamily: fonts.body, fontSize: 13, color: palette.inkFaint }}>
              Each row needs a builder and PDF and/or text
            </span>
          ) : null}
          <Button variant="accent" onClick={submit} disabled={!canSubmit || submitting}>
            {submitting ? "Submitting…" : "Submit for review →"}
          </Button>
        </div>
      </div>
    </div>
  );
}
