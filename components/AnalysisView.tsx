"use client";

import type { AiAnalysis } from "@/lib/types";
import { fonts, palette } from "@/components/style";
import { Pill } from "@/components/Pill";

export function AnalysisView({ ai }: { ai: AiAnalysis }) {
  const builderKeys =
    ai.scope_comparison?.length && ai.scope_comparison[0].builders
      ? Object.keys(ai.scope_comparison[0].builders)
      : [];

  return (
    <div>
      <div
        style={{
          background: palette.ink,
          color: palette.bg,
          padding: "28px 32px",
          borderRadius: 4,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: 11,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            opacity: 0.6,
            marginBottom: 8,
          }}
        >
          Best value · AI recommendation
        </div>
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 26,
            fontWeight: 400,
            letterSpacing: -0.3,
            marginBottom: 10,
          }}
        >
          {ai.best_value?.builder}
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 1.6, opacity: 0.85 }}>
          {ai.best_value?.reasoning}
        </div>
      </div>

      <div
        style={{
          background: palette.card,
          padding: 24,
          borderRadius: 4,
          border: `1px solid ${palette.line}`,
          marginBottom: 24,
        }}
      >
        <h4 style={{ fontFamily: fonts.display, fontSize: 18, margin: "0 0 16px", color: palette.ink }}>The numbers</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {ai.totals?.map((t, i) => (
            <div
              key={i}
              style={{
                padding: 16,
                background: palette.bg,
                borderRadius: 4,
                border: `1px solid ${palette.line}`,
              }}
            >
              <div style={{ fontFamily: fonts.body, fontSize: 12, color: palette.inkSoft, marginBottom: 6 }}>
                {t.builder}
              </div>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: 26,
                  color: palette.ink,
                  fontWeight: 500,
                  marginBottom: 6,
                }}
              >
                {t.total_inc_gst}
              </div>
              <Pill tone={t.gst_clear ? "ok" : "warn"}>{t.gst_clear ? "GST clear" : "GST unclear"}</Pill>
              {t.notes && (
                <div
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 12,
                    color: palette.inkSoft,
                    marginTop: 8,
                    lineHeight: 1.5,
                  }}
                >
                  {t.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {ai.scope_comparison?.length ? (
        <div
          style={{
            background: palette.card,
            padding: 24,
            borderRadius: 4,
            border: `1px solid ${palette.line}`,
            marginBottom: 24,
          }}
        >
          <h4 style={{ fontFamily: fonts.display, fontSize: 18, margin: "0 0 16px", color: palette.ink }}>
            Side by side
          </h4>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fonts.body }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${palette.line}` }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: 10,
                      fontSize: 11,
                      color: palette.inkFaint,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      fontWeight: 500,
                    }}
                  >
                    Item
                  </th>
                  {builderKeys.map((b) => (
                    <th
                      key={b}
                      style={{
                        textAlign: "left",
                        padding: 10,
                        fontSize: 11,
                        color: palette.inkFaint,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        fontWeight: 500,
                      }}
                    >
                      {b}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ai.scope_comparison.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${palette.line}` }}>
                    <td style={{ padding: "12px 10px", fontSize: 13, fontWeight: 500, color: palette.ink }}>
                      {row.item}
                    </td>
                    {Object.entries(row.builders || {}).map(([b, v]) => (
                      <td
                        key={b}
                        style={{
                          padding: "12px 10px",
                          fontSize: 13,
                          color: /not stated|not included|missing/i.test(String(v)) ? palette.danger : palette.inkSoft,
                        }}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {ai.scope_gaps?.length ? (
          <div
            style={{
              background: palette.warnSoft,
              padding: 24,
              borderRadius: 4,
              border: `1px solid ${palette.warn}33`,
            }}
          >
            <h4 style={{ fontFamily: fonts.display, fontSize: 16, margin: "0 0 12px", color: palette.warn }}>
              Scope gaps
            </h4>
            <ul
              style={{
                margin: 0,
                padding: "0 0 0 18px",
                fontFamily: fonts.body,
                fontSize: 13,
                color: palette.ink,
                lineHeight: 1.6,
              }}
            >
              {ai.scope_gaps.map((g, i) => (
                <li key={i} style={{ marginBottom: 6 }}>
                  {g}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {ai.red_flags?.length ? (
          <div
            style={{
              background: palette.dangerSoft,
              padding: 24,
              borderRadius: 4,
              border: `1px solid ${palette.danger}33`,
            }}
          >
            <h4 style={{ fontFamily: fonts.display, fontSize: 16, margin: "0 0 12px", color: palette.danger }}>
              Red flags
            </h4>
            <ul
              style={{
                margin: 0,
                padding: "0 0 0 18px",
                fontFamily: fonts.body,
                fontSize: 13,
                color: palette.ink,
                lineHeight: 1.6,
              }}
            >
              {ai.red_flags.map((f, i) => (
                <li key={i} style={{ marginBottom: 6 }}>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {ai.summary ? (
        <div
          style={{
            marginTop: 24,
            padding: 24,
            background: palette.accentSoft,
            borderRadius: 4,
            borderLeft: `4px solid ${palette.accent}`,
          }}
        >
          <div
            style={{
              fontFamily: fonts.body,
              fontSize: 11,
              color: palette.accent,
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Plain English
          </div>
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 17,
              color: palette.ink,
              lineHeight: 1.5,
              fontStyle: "italic",
            }}
          >
            {ai.summary}
          </div>
        </div>
      ) : null}
    </div>
  );
}
