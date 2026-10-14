import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: "brand" | "green" | "amber" | "violet" | "red";
  icon?: ReactNode;
}

const ACCENT_STYLES: Record<
  NonNullable<StatCardProps["color"]>,
  { badgeBg: string; textBadge: string; tagBg: string }
> = {
  brand: { badgeBg: "#38bdf8", textBadge: "#0369a1", tagBg: "#e0f2fe" },
  violet: { badgeBg: "#a78bfa", textBadge: "#5b21b6", tagBg: "#ede9fe" },
  amber: { badgeBg: "#facc15", textBadge: "#854d0e", tagBg: "#fef9c3" },
  green: { badgeBg: "#4ade80", textBadge: "#166534", tagBg: "#dcfce7" },
  red: { badgeBg: "#f87171", textBadge: "#991b1b", tagBg: "#fee2e2" },
};

export function StatCard({ label, value, sub, color = "brand", icon }: StatCardProps) {
  const accent = ACCENT_STYLES[color] ?? ACCENT_STYLES.brand;

  return (
    <div
      style={{
        background: "#ffffff",
        border: "var(--border-thick)",
        borderRadius: "var(--radius-lg)",
        padding: "20px 22px",
        boxShadow: "var(--shadow-base)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "135px",
        position: "relative",
        transition: "all 0.15s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#4b5563",
          }}
        >
          {label}
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: accent.badgeBg,
            border: "1.5px solid #121212",
            boxShadow: "1.5px 1.5px 0px #121212",
          }}
        >
          {icon ?? (
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#121212",
              }}
            />
          )}
        </div>
      </div>

      <div style={{ marginTop: "12px" }}>
        <div
          style={{
            fontSize: "30px",
            fontWeight: 900,
            color: "#121212",
            letterSpacing: "-0.03em",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
        {sub && (
          <div style={{ marginTop: "8px" }}>
            <span
              style={{
                display: "inline-block",
                fontSize: "11px",
                fontWeight: 700,
                color: accent.textBadge,
                background: accent.tagBg,
                padding: "2px 8px",
                borderRadius: "var(--radius-pill)",
                border: "1px solid #121212",
              }}
            >
              {sub}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
