"use client";

import type { CSSProperties, ReactNode } from "react";
import { fonts, palette } from "@/components/style";

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "accent" | "ghost";
  disabled?: boolean;
  style?: CSSProperties;
}) {
  const base: CSSProperties = {
    padding: "11px 20px",
    borderRadius: 4,
    fontSize: 14,
    fontWeight: 500,
    fontFamily: fonts.body,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "all 0.15s",
    border: "none",
    letterSpacing: 0.2,
  };
  const variants: Record<typeof variant, CSSProperties> = {
    primary: { ...base, background: palette.ink, color: palette.bg },
    accent: { ...base, background: palette.accent, color: "#fff" },
    ghost: { ...base, background: "transparent", color: palette.ink, border: `1px solid ${palette.line}` },
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{ ...variants[variant], ...style }}>
      {children}
    </button>
  );
}
