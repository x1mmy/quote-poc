"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { Submission } from "@/lib/types";
import { fonts, palette } from "@/components/style";
import { Pill } from "@/components/Pill";
import { ReviewPanel } from "@/components/ReviewPanel";

export function PartnerView({
  submissions,
  setSubmissions,
  selectedId,
  setSelectedId,
  onApproved,
}: {
  submissions: Submission[];
  setSubmissions: Dispatch<SetStateAction<Submission[]>>;
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  onApproved: () => void;
}) {
  useEffect(() => {
    if (submissions.length === 0) return;
    if (selectedId && submissions.some((s) => s.id === selectedId)) return;
    const pending = submissions.find((s) => s.status !== "reviewed");
    setSelectedId(pending?.id ?? submissions[0].id);
  }, [submissions, selectedId, setSelectedId]);

  const selected = submissions.find((s) => s.id === selectedId);

  if (submissions.length === 0) {
    return (
      <div style={{ maxWidth: 600, margin: "120px auto", textAlign: "center", padding: "0 36px" }}>
        <div style={{ fontFamily: fonts.display, fontSize: 28, color: palette.inkSoft, fontStyle: "italic" }}>
          No submissions yet.
        </div>
        <p style={{ fontFamily: fonts.body, fontSize: 14, color: palette.inkFaint, marginTop: 12 }}>
          Switch to <strong>Customer view</strong> and submit one to see the review flow.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", minHeight: "calc(100vh - 81px)" }}>
      <aside
        style={{
          borderRight: `1px solid ${palette.line}`,
          background: palette.card,
          padding: "24px 0",
        }}
      >
        <div style={{ padding: "0 24px 16px" }}>
          <div
            style={{
              fontFamily: fonts.body,
              fontSize: 11,
              color: palette.inkFaint,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 4,
            }}
          >
            Queue
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 20, color: palette.ink }}>
            {submissions.filter((s) => s.status !== "reviewed").length} pending
          </div>
        </div>
        {submissions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelectedId(s.id)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "14px 24px",
              border: "none",
              background: selectedId === s.id ? palette.bg : "transparent",
              borderLeft: selectedId === s.id ? `3px solid ${palette.accent}` : `3px solid transparent`,
              cursor: "pointer",
              fontFamily: fonts.body,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 500, color: palette.ink, marginBottom: 4 }}>
              {s.projectDescription.slice(0, 55)}
              {s.projectDescription.length > 55 ? "…" : ""}
            </div>
            <div style={{ fontSize: 11, color: palette.inkFaint, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span>{s.quotes.length} quotes</span>
              <span>·</span>
              <span>
                {new Date(s.createdAt).toLocaleString("en-AU", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "numeric",
                  month: "short",
                })}
              </span>
              {s.status === "reviewed" && <Pill tone="ok">Sent</Pill>}
              {s.status === "analysing" && <Pill tone="warn">Analysing</Pill>}
              {s.status === "ready" && <Pill tone="accent">Ready</Pill>}
              {s.status === "error" && <Pill tone="danger">Error</Pill>}
            </div>
          </button>
        ))}
      </aside>
      {selected ? (
        <ReviewPanel
          key={selected.id}
          submission={selected}
          onUpdate={(updated) => {
            setSubmissions((subs) => subs.map((x) => (x.id === updated.id ? updated : x)));
          }}
          onApproved={onApproved}
        />
      ) : null}
    </div>
  );
}
