"use client";

import { useState, useTransition } from "react";
import { CheckCircle, XCircle, Clock, AlertTriangle, ShieldAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { approveEscalation, rejectEscalation } from "@/lib/actions/escalations";
import toast from "react-hot-toast";

export interface EscalationItem {
  id: string;
  purchaseRequestId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  leashReasoning: string;
  expiresAt: string;
  createdAt: string;
  purchaseRequest: {
    itemName: string;
    vendorName: string;
    amountCents: number;
    currency: string;
    justification: string;
    category: string | null;
  };
  decision: {
    llmReason: string | null;
    llmRiskFlags: string[] | null;
    ruleResults: {
      failedRules: string[];
    };
  } | null;
}

interface EscalationInboxProps {
  escalations: EscalationItem[];
}

export function EscalationInbox({ escalations }: EscalationInboxProps) {
  const pending = escalations.filter((e) => e.status === "PENDING");

  if (pending.length === 0) {
    return (
      <div
        className="card"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 20px",
          textAlign: "center",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "var(--neo-green-light)",
            border: "var(--border-medium)",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
          }}
        >
          <CheckCircle size={30} color="#065f46" strokeWidth={2.5} />
        </div>
        <p style={{ fontSize: "18px", fontWeight: 900, color: "#121212" }}>All Caught Up!</p>
        <p style={{ fontSize: "13px", fontWeight: 500, color: "#6b7280", marginTop: "4px" }}>
          No purchase requests require human intervention right now.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {pending.map((esc) => (
        <EscalationCard key={esc.id} escalation={esc} />
      ))}
    </div>
  );
}

function EscalationCard({ escalation: esc }: { escalation: EscalationItem }) {
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const [resolved, setResolved] = useState(false);

  const expiresIn = formatDistanceToNow(new Date(esc.expiresAt), { addSuffix: true });
  const amount = `$${(esc.purchaseRequest.amountCents / 100).toFixed(2)} ${esc.purchaseRequest.currency}`;

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveEscalation(esc.id, comment);
      if (result.success) {
        toast.success("Purchase approved — authorization will proceed.");
        setResolved(true);
      } else {
        toast.error(result.error ?? "Failed to approve.");
      }
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      const result = await rejectEscalation(esc.id, comment);
      if (result.success) {
        toast.success("Purchase rejected — nothing was charged.");
        setResolved(true);
      } else {
        toast.error(result.error ?? "Failed to reject.");
      }
    });
  };

  if (resolved) return null;

  return (
    <div
      className="card"
      style={{
        background: "#ffffff",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "14px",
          borderBottom: "var(--border-thin)",
          paddingBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#fef08a",
              border: "var(--border-medium)",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={20} color="#b45309" strokeWidth={2.5} />
          </div>
          <div>
            <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#121212" }}>
              {esc.purchaseRequest.itemName}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#4f46e5" }}>
                {esc.purchaseRequest.vendorName}
              </span>
              {esc.purchaseRequest.category && (
                <>
                  <span style={{ color: "#9ca3af" }}>•</span>
                  <span
                    style={{
                      background: "#f1f5f9",
                      border: "1px solid #121212",
                      borderRadius: "var(--radius-pill)",
                      padding: "1px 8px",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    {esc.purchaseRequest.category}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 900,
              color: "#121212",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {amount}
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#b45309",
              background: "#fef3c7",
              border: "1px solid #121212",
              borderRadius: "var(--radius-pill)",
              padding: "2px 8px",
              marginTop: "4px",
            }}
          >
            <Clock size={11} strokeWidth={2.5} />
            Expires {expiresIn}
          </div>
        </div>
      </div>

      {/* Justifications in Neo-Brutalist boxes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
        <div
          style={{
            background: "#f8faf5",
            border: "var(--border-medium)",
            borderRadius: "var(--radius-md)",
            padding: "14px 16px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#121212",
              marginBottom: "6px",
            }}
          >
            🤖 Agent Justification
          </div>
          <p style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>
            {esc.purchaseRequest.justification}
          </p>
        </div>

        <div
          style={{
            background: "#f8faf5",
            border: "var(--border-medium)",
            borderRadius: "var(--radius-md)",
            padding: "14px 16px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#121212",
              marginBottom: "6px",
            }}
          >
            ⚖️ Policy Decision Reasoning
          </div>
          <p style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>
            {esc.leashReasoning}
          </p>
        </div>
      </div>

      {/* Risk flags */}
      {esc.decision?.llmRiskFlags && esc.decision.llmRiskFlags.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "#991b1b" }}>
            Flagged:
          </span>
          {esc.decision.llmRiskFlags.map((flag) => (
            <span
              key={flag}
              style={{
                background: "#fee2e2",
                color: "#991b1b",
                border: "1.5px solid #121212",
                borderRadius: "var(--radius-pill)",
                padding: "2px 10px",
                fontSize: "11px",
                fontWeight: 800,
                boxShadow: "1.5px 1.5px 0px #121212",
              }}
            >
              {flag}
            </span>
          ))}
        </div>
      )}

      {/* Operator Comment Box */}
      <div>
        <label
          htmlFor={`comment-${esc.id}`}
          style={{
            display: "block",
            fontSize: "12px",
            fontWeight: 800,
            color: "#121212",
            textTransform: "uppercase",
            marginBottom: "6px",
          }}
        >
          Operator Note (optional)
        </label>
        <textarea
          id={`comment-${esc.id}`}
          className="input"
          style={{
            borderRadius: "var(--radius-md)",
            width: "100%",
            resize: "vertical",
            minHeight: "60px",
          }}
          rows={2}
          placeholder="Add an audit note explaining your decision…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={isPending}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingTop: "6px" }}>
        <button
          id={`approve-${esc.id}`}
          onClick={handleApprove}
          disabled={isPending}
          className="btn"
          style={{
            background: "var(--neo-green-light)",
            color: "#064e3b",
            padding: "8px 20px",
            fontSize: "13px",
            borderRadius: "var(--radius-pill)",
          }}
        >
          <CheckCircle size={16} strokeWidth={2.5} />
          <span>Approve & Authorize</span>
        </button>
        <button
          id={`reject-${esc.id}`}
          onClick={handleReject}
          disabled={isPending}
          className="btn"
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "8px 20px",
            fontSize: "13px",
            borderRadius: "var(--radius-pill)",
          }}
        >
          <XCircle size={16} strokeWidth={2.5} />
          <span>Reject Request</span>
        </button>
      </div>
    </div>
  );
}
