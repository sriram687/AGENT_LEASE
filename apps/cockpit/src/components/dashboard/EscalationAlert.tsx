import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

interface EscalationAlertProps {
  count: number;
}

export function EscalationAlert({ count }: EscalationAlertProps) {
  return (
    <div
      className="flex items-center justify-between rounded-xl border px-5 py-4"
      style={{
        background: "rgba(245,158,11,0.06)",
        borderColor: "rgba(245,158,11,0.25)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: "rgba(245,158,11,0.12)" }}
        >
          <AlertTriangle size={16} color="#f59e0b" />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: "#fbbf24" }}>
            {count} purchase request{count > 1 ? "s" : ""} awaiting your review
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            These will expire if not actioned within the mandate escalation window.
          </p>
        </div>
      </div>
      <Link
        href="/escalations"
        className="btn btn-sm flex items-center gap-1.5"
        style={{
          background: "rgba(245,158,11,0.12)",
          color: "#fbbf24",
          border: "1px solid rgba(245,158,11,0.3)",
          borderRadius: "8px",
          padding: "6px 14px",
          fontSize: "12px",
          fontWeight: 500,
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Review now <ArrowRight size={13} />
      </Link>
    </div>
  );
}
