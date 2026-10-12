import clsx from "clsx";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: "brand" | "green" | "amber" | "violet" | "red";
  icon?: ReactNode;
}

const ACCENT: Record<NonNullable<StatCardProps["color"]>, string> = {
  brand:  "rgba(59,130,246,0.08)",
  green:  "rgba(34,197,94,0.08)",
  amber:  "rgba(245,158,11,0.08)",
  violet: "rgba(139,92,246,0.08)",
  red:    "rgba(239,68,68,0.08)",
};
const ACCENT_TEXT: Record<NonNullable<StatCardProps["color"]>, string> = {
  brand:  "#60a5fa",
  green:  "#4ade80",
  amber:  "#fbbf24",
  violet: "#a78bfa",
  red:    "#f87171",
};

export function StatCard({ label, value, sub, color = "brand", icon }: StatCardProps) {
  return (
    <div className="stat-card">
      {/* Accent top border */}
      <div
        className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl"
        style={{ background: ACCENT_TEXT[color] }}
      />

      <div className="flex items-start justify-between">
        <p
          className="text-xs font-medium uppercase tracking-widest"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {label}
        </p>
        {icon && (
          <div
            className="rounded-lg p-1.5"
            style={{ background: ACCENT[color], color: ACCENT_TEXT[color] }}
          >
            {icon}
          </div>
        )}
      </div>

      <p
        className="mt-3 text-2xl font-semibold tabular-nums"
        style={{ color: ACCENT_TEXT[color] }}
      >
        {value}
      </p>

      {sub && (
        <p
          className="mt-1 text-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
