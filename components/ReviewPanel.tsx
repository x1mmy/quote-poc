"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Submission } from "@/lib/types";
import { fonts, palette } from "@/components/style";
import { Button } from "@/components/Button";
import { AnalysisView } from "@/components/AnalysisView";
import { Pill } from "@/components/Pill";

export function ReviewPanel({
  submission,
  onUpdate,
  onApproved,
}: {
  submission: Submission;
  onUpdate: (s: Submission) => void;
  onApproved: () => void;
}) {
  const [notes, setNotes] = useState(submission.partnerNotes || "");
  const [tab, setTab] = useState<"analysis" | "source" | "notes">("analysis");
  const prev = useRef({ id: submission.id, status: submission.status });

  useEffect(() => {
    if (prev.current.id !== submission.id) {
      prev.current = { id: submission.id, status: submission.status };
      return;
    }
    if (prev.current.status === "analysing" && submission.status === "ready" && submission.aiAnalysis) {
      toast.message("Add your reviewer notes", {
        description:
          "Review the AI breakdown, then write your professional notes before approving to send this back to the customer.",
        duration: 8000,
      });
    }
    prev.current = { id: submission.id, status: submission.status };
  }, [submission.id, submission.status, submission.aiAnalysis]);

  const approve = () => {
    onUpdate({ ...submission, partnerNotes: notes, status: "reviewed" });
    toast.success("Sent to customer", {
      description: "Switch to Customer view to preview the final report the homeowner sees.",
      duration: 9000,
    });
    onApproved();
  };

  const ai = submission.aiAnalysis;

  return (
    <main style={{ padding: 36, background: palette.bg, overflow: "auto" }}>
      <div style={{ maxWidth: 920 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: 11,
                color: palette.inkFaint,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              Submission · #{submission.id.slice(-6)}
            </div>
            <h1
              style={{
                fontFamily: fonts.display,
                fontSize: 28,
                fontWeight: 400,
                color: palette.ink,
                margin: 0,
                letterSpacing: -0.3,
                lineHeight: 1.3,
              }}
            >
              {submission.projectDescription}
            </h1>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 4,
            marginTop: 28,
            marginBottom: 24,
            borderBottom: `1px solid ${palette.line}`,
          }}
        >
          {(
            [
              ["analysis", "AI Analysis"],
              ["source", "Source quotes"],
              ["notes", "Reviewer notes"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              style={{
                background: "none",
                border: "none",
                padding: "12px 18px",
                fontFamily: fonts.body,
                fontSize: 13,
                fontWeight: 500,
                color: tab === k ? palette.ink : palette.inkFaint,
                borderBottom: tab === k ? `2px solid ${palette.accent}` : "2px solid transparent",
                marginBottom: -1,
                cursor: "pointer",
                letterSpacing: 0.2,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "analysis" && (
          <div>
            {submission.status === "error" && (
              <div
                style={{
                  padding: 24,
                  background: palette.dangerSoft,
                  borderRadius: 4,
                  color: palette.danger,
                  fontFamily: fonts.body,
                  marginBottom: 16,
                }}
              >
                Analysis failed
                {submission.errorMessage ? `: ${submission.errorMessage}` : "."}
              </div>
            )}
            {ai && <AnalysisView ai={ai} />}
          </div>
        )}

        {tab === "source" && (
          <div>
            {submission.quotes.map((q, i) => (
              <div
                key={i}
                style={{
                  background: palette.card,
                  padding: 24,
                  borderRadius: 4,
                  border: `1px solid ${palette.line}`,
                  marginBottom: 16,
                }}
              >
                <h4 style={{ fontFamily: fonts.display, fontSize: 18, margin: "0 0 12px", color: palette.ink }}>
                  {i + 1}. {q.builder}
                </h4>
                {q.pdfFileName ? (
                  <div style={{ marginBottom: 12 }}>
                    <Pill tone="accent">PDF · {q.pdfFileName}</Pill>
                  </div>
                ) : null}
                <pre
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: 12,
                    color: palette.inkSoft,
                    whiteSpace: "pre-wrap",
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {q.content?.trim() ? q.content : "— No pasted text (PDF-only submission) —"}
                </pre>
              </div>
            ))}
          </div>
        )}

        {tab === "notes" && (
          <div>
            {submission.status === "ready" && ai ? (
              <div
                style={{
                  marginBottom: 16,
                  padding: 14,
                  background: palette.warnSoft,
                  borderRadius: 4,
                  border: `1px solid ${palette.warn}44`,
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: palette.warn,
                  lineHeight: 1.5,
                }}
              >
                Add your professional notes below, then approve to send this package to the customer.
              </div>
            ) : null}
            <div style={{ background: palette.card, padding: 24, borderRadius: 4, border: `1px solid ${palette.line}` }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 12,
                  fontFamily: fonts.body,
                  fontSize: 12,
                  color: palette.inkSoft,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                }}
              >
                Notes to send to the customer
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={10}
                placeholder="Add your professional take. This goes to the customer..."
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
                  lineHeight: 1.6,
                }}
              />
              <div style={{ marginTop: 16, display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <Button variant="ghost" onClick={() => onUpdate({ ...submission, partnerNotes: notes })}>
                  Save draft
                </Button>
                <Button variant="accent" onClick={approve} disabled={!notes.trim() || !ai}>
                  Approve & send to customer
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
