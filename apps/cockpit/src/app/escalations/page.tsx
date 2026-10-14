import { Suspense } from "react";
import { EscalationInbox } from "@/components/escalations/EscalationInbox";
import { getPendingEscalations } from "@/lib/api/escalations";

export const metadata = { title: "Escalations — Agent Leash" };
export const dynamic = "force-dynamic";

export default async function EscalationsPage() {
  const escalations = await getPendingEscalations();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="animate-fade-in">
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          background: "#ffffff",
          border: "var(--border-thick)",
          borderRadius: "var(--radius-lg)",
          padding: "20px 24px",
          boxShadow: "var(--shadow-base)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 900, color: "#121212", letterSpacing: "-0.02em" }}>
              ESCALATION INBOX
            </h1>
            <span
              style={{
                background: "var(--neo-yellow)",
                border: "1.5px solid #121212",
                padding: "2px 10px",
                borderRadius: "var(--radius-pill)",
                fontSize: "11px",
                fontWeight: 800,
                boxShadow: "1.5px 1.5px 0px #121212",
              }}
            >
              HUMAN IN THE LOOP
            </span>
          </div>
          <p style={{ fontSize: "13px", fontWeight: 500, color: "#4b5563", marginTop: "4px" }}>
            Purchase requests that exceeded auto-approve policy thresholds and require human authorization.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#fef08a",
            border: "var(--border-medium)",
            borderRadius: "var(--radius-pill)",
            padding: "8px 16px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: 900, color: "#121212" }}>
            {escalations.length}
          </span>
          <span style={{ fontSize: "12px", fontWeight: 800, color: "#854d0e" }}>
            PENDING REVIEW
          </span>
        </div>
      </div>

      <Suspense fallback={<InboxSkeleton />}>
        <EscalationInbox escalations={escalations as any} />
      </Suspense>
    </div>
  );
}

function InboxSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="card" style={{ height: "180px", opacity: 0.6 }} />
      ))}
    </div>
  );
}
