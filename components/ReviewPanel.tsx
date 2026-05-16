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
  onPersistSubmission,
  onApproved,
  compact = false,
}: {
  submission: Submission;
  onUpdate: (s: Submission) => void;
  onPersistSubmission: (s: Submission) => Promise<Submission>;
  onApproved: () => void;
  /** Narrow / mobile layout */
  compact?: boolean;
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

  const saveDraft = async () => {
    if (!canPersist) return;
    const updated = { ...submission, partnerNotes: notes };
    onUpdate(updated);
    try {
      await onPersistSubmission(updated);
      toast.success("Draft saved");
    } catch (e) {
      toast.error("Could not save draft", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    }
  };

  const approve = async () => {
    if (!canPersist) return;
    const updated = { ...submission, partnerNotes: notes, status: "reviewed" as const };
    onUpdate(updated);
    try {
      await onPersistSubmission(updated);
      toast.success("Sent to customer", {
        description: "Switch to Customer view to preview the final report the homeowner sees.",
        duration: 9000,
      });
      onApproved();
    } catch (e) {
      toast.error("Could not approve", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    }
  };

  const ai = submission.aiAnalysis;
  const canPersist = !submission.id.startsWith("temp_");

  return (
    <main
      style={{
        padding: compact ? 16 : 36,
        background: palette.bg,
        overflow: "auto",
        flex: compact ? 1 : undefined,
        minHeight: compact ? 0 : undefined,
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div style={{ maxWidth: 920, margin: compact ? "0 auto" : undefined, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ minWidth: 0 }}>
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
                fontSize: compact ? 22 : 28,
                fontWeight: 400,
                color: palette.ink,
                margin: 0,
                letterSpacing: -0.3,
                lineHeight: 1.3,
                wordBreak: "break-word",
              }}
            >
              {submission.projectDescription}
            </h1>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: compact ? 2 : 4,
            marginTop: compact ? 20 : 28,
            marginBottom: 24,
            borderBottom: `1px solid ${palette.line}`,
            flexWrap: "wrap",
            overflowX: compact ? "auto" : undefined,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {(
            [
              ["analysis", compact ? "AI" : "AI Analysis"],
              ["source", compact ? "Source" : "Source quotes"],
              ["notes", compact ? "Notes" : "Reviewer notes"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              style={{
                background: "none",
                border: "none",
                padding: compact ? "10px 12px" : "12px 18px",
                fontFamily: fonts.body,
                fontSize: compact ? 12 : 13,
                fontWeight: 500,
                color: tab === k ? palette.ink : palette.inkFaint,
                borderBottom: tab === k ? `2px solid ${palette.accent}` : "2px solid transparent",
                marginBottom: -1,
                cursor: "pointer",
                letterSpacing: 0.2,
                flexShrink: 0,
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
                  padding: compact ? 16 : 24,
                  borderRadius: 4,
                  border: `1px solid ${palette.line}`,
                  marginBottom: 16,
                }}
              >
                <h4 style={{ fontFamily: fonts.display, fontSize: 18, margin: "0 0 12px", color: palette.ink }}>
                  {i + 1}. {q.builder}
                </h4>
                {q.pdfFileName ? (
                  <div style={{ marginBottom: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <Pill tone="accent">PDF · {q.pdfFileName}</Pill>
                    <a
                      href={`/api/submissions/${submission.id}/pdf/${i}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 13,
                        fontWeight: 500,
                        color: palette.accent,
                        textDecoration: "none",
                      }}
                    >
                      View PDF
                    </a>
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
            <div style={{ background: palette.card, padding: compact ? 16 : 24, borderRadius: 4, border: `1px solid ${palette.line}` }}>
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
              <div style={{ marginTop: 16, display: "flex", gap: 12, justifyContent: "flex-end", flexDirection: compact ? "column" : "row", flexWrap: "wrap" }}>
                <Button
                  variant="ghost"
                  onClick={() => void saveDraft()}
                  disabled={!canPersist}
                  style={compact ? { width: "100%" } : undefined}
                >
                  Save draft
                </Button>
                <Button
                  variant="accent"
                  onClick={() => void approve()}
                  disabled={!canPersist || !notes.trim() || !ai}
                  style={compact ? { width: "100%" } : undefined}
                >
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
