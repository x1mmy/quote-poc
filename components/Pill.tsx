"use client";

import type { ReactNode } from "react";
import { fonts, palette } from "@/components/style";

const tones = {
  neutral: { bg: palette.line, fg: palette.ink },
  accent: { bg: palette.accentSoft, fg: palette.accent },
  ok: { bg: palette.okSoft, fg: palette.ok },
  warn: { bg: palette.warnSoft, fg: palette.warn },
  danger: { bg: palette.dangerSoft, fg: palette.danger },
} as const;

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof tones }) {
  const t = tones[tone];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        background: t.bg,
        color: t.fg,
        fontFamily: fonts.body,
      }}
    >
      {children}
    </span>
  );
}
