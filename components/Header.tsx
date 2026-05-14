"use client";

import { fonts, palette } from "@/components/style";

export function Header({
  view,
  setView,
}: {
  view: "customer" | "partner";
  setView: (v: "customer" | "partner") => void;
}) {
  return (
    <header
      style={{
        borderBottom: `1px solid ${palette.line}`,
        padding: "20px 36px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: palette.bg,
      }}
    >
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: 11,
          color: palette.inkSoft,
          letterSpacing: 1.5,
          textTransform: "uppercase",
        }}
      >
        quote intelligence
      </div>
      <div
        style={{
          display: "flex",
          background: palette.card,
          borderRadius: 4,
          border: `1px solid ${palette.line}`,
          padding: 3,
        }}
      >
        {(["customer", "partner"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            style={{
              padding: "7px 16px",
              borderRadius: 3,
              border: "none",
              fontFamily: fonts.body,
              fontSize: 12,
              fontWeight: 500,
              background: view === v ? palette.ink : "transparent",
              color: view === v ? palette.bg : palette.inkSoft,
              cursor: "pointer",
              textTransform: "capitalize",
              letterSpacing: 0.3,
            }}
          >
            {v === "partner" ? "Partner view" : "Customer view"}
          </button>
        ))}
      </div>
    </header>
  );
}
