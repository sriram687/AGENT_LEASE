import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

interface EscalationAlertProps {
  count: number;
}

export function EscalationAlert({ count }: EscalationAlertProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "16px",
        background: "#fef08a",
        border: "var(--border-thick)",
        borderRadius: "var(--radius-lg)",
        padding: "16px 22px",
        boxShadow: "var(--shadow-base)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div
          style={{
            display: "flex",
            height: "40px",
            width: "40px",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "10px",
            background: "#ffffff",
            border: "var(--border-medium)",
            boxShadow: "2px 2px 0px #121212",
          }}
        >
          <AlertTriangle size={20} color="#b45309" strokeWidth={2.5} />
        </div>
        <div>
          <p style={{ fontSize: "15px", fontWeight: 800, color: "#121212" }}>
            {count} purchase request{count > 1 ? "s" : ""} awaiting your review
          </p>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "#78350f", marginTop: "2px" }}>
            Action required before expiration window elapses.
          </p>
        </div>
      </div>

      <Link
        href="/escalations"
        className="btn"
        style={{
          background: "#121212",
          color: "#ffffff",
          padding: "8px 18px",
          fontSize: "13px",
          borderRadius: "var(--radius-pill)",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          textDecoration: "none",
        }}
      >
        <span>Review Escalations</span>
        <ArrowRight size={15} strokeWidth={2.5} />
      </Link>
    </div>
  );
}
