"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { fonts, palette } from "@/components/style";

const STAGES = [
  "Reading quotes and attachments…",
  "Normalising totals and GST treatment…",
  "Comparing scope line by line…",
  "Stress-testing exclusions and payment terms…",
] as const;

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AnalysingOverlay() {
  const [stage, setStage] = useState(0);
  const reduceMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, () => false);

  useEffect(() => {
    if (reduceMotion) return;
    const t = window.setInterval(() => {
      setStage((s) => (s + 1) % STAGES.length);
    }, 2600);
    return () => window.clearInterval(t);
  }, [reduceMotion]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(28, 25, 23, 0.45)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      role="status"
      aria-live="polite"
      aria-label="Analysing quotes"
    >
      <div
        style={{
          maxWidth: 440,
          width: "100%",
          background: palette.card,
          borderRadius: 8,
          border: `1px solid ${palette.line}`,
          padding: "40px 36px",
          textAlign: "center",
          boxShadow: "0 24px 48px rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: `3px solid ${palette.line}`,
            borderTopColor: palette.accent,
            borderRadius: "50%",
            margin: "0 auto 20px",
            animation: reduceMotion ? undefined : "plumblineSpin 0.85s linear infinite",
          }}
        />
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 22,
            fontStyle: "italic",
            color: palette.ink,
            marginBottom: 12,
            letterSpacing: -0.3,
          }}
        >
          Gemini is on the tools…
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: 14, color: palette.inkSoft, lineHeight: 1.55, minHeight: 48 }}>
          {STAGES[stage]}
        </div>
        <div style={{ marginTop: 20, fontFamily: fonts.body, fontSize: 12, color: palette.inkFaint }}>
          This usually takes a few seconds. PDFs may take a little longer.
        </div>
      </div>
      <style>{`@keyframes plumblineSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
