"use client";

import { useState, useEffect, useTransition } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Bot,
  Store,
  Tag,
  Zap,
  ArrowRight,
  ExternalLink,
  CreditCard,
  MessageSquare,
} from "lucide-react";
import {
  approveEscalation,
  rejectEscalation,
  triggerDemoEscalation,
} from "@/lib/actions/escalations";
import toast from "react-hot-toast";

export interface EscalationItem {
  id: string;
  purchaseRequestId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  leashReasoning: string;
  humanComment?: string | null;
  expiresAt: string;
  createdAt: string;
  agentName?: string;
  mandatePurpose?: string;
  perPurchaseCapCents?: number;
  purchaseRequest: {
    id: string;
    itemName: string;
    vendorName: string;
    amountCents: number;
    currency: string;
    justification: string;
    category: string | null;
  };
  decision?: {
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

export function EscalationInbox({ escalations: initialEscalations }: EscalationInboxProps) {
  const [escalations, setEscalations] = useState<EscalationItem[]>(initialEscalations);
  const [isTriggering, startTriggerTransition] = useTransition();

  useEffect(() => {
    setEscalations(initialEscalations);
  }, [initialEscalations]);

  const pending = escalations.filter((e) => e.status === "PENDING");

  const handleTriggerDemo = () => {
    startTriggerTransition(async () => {
      const res = await triggerDemoEscalation();
      if (res.success) {
        toast.success("Test over-cap escalation triggered! Request routed to inbox.", {
          icon: "⚡",
        });
        window.location.reload();
      } else {
        toast.error(res.error ?? "Failed to trigger test escalation");
      }
    });
  };

  if (pending.length === 0) {
    return (
      <div
        style={{
          background: "#ffffff",
          border: "var(--border-thick)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-base)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "54px 24px",
          textAlign: "center",
        }}
        className="animate-fade-in"
      >
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "var(--neo-green)",
            border: "var(--border-thick)",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
          }}
        >
          <CheckCircle size={32} color="#121212" strokeWidth={2.5} />
        </div>
        <h2 style={{ fontSize: "20px", fontWeight: 900, color: "#121212", margin: 0 }}>
          All Escalations Cleared!
        </h2>
        <p
          style={{
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--color-ink-muted)",
            maxWidth: "460px",
            marginTop: "6px",
            lineHeight: 1.5,
          }}
        >
          Zero purchase requests currently require operator triage. All autonomous agent payments are flowing within their cryptographic mandate limits.
        </p>

        {/* 1-Click Trigger Test Escalation */}
        <div
          style={{
            marginTop: "24px",
            padding: "16px 20px",
            background: "#f8faf5",
            border: "1.5px dashed #cbd5e1",
            borderRadius: "var(--radius-md)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            maxWidth: "480px",
            width: "100%",
          }}
        >
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>
            Want to test human-in-the-loop approval with real PayPal 2PC holds?
          </span>
          <button
            onClick={handleTriggerDemo}
            disabled={isTriggering}
            style={{
              padding: "10px 22px",
              background: "var(--neo-yellow)",
              color: "#121212",
              border: "var(--border-medium)",
              borderRadius: "var(--radius-pill)",
              boxShadow: "var(--shadow-sm)",
              fontSize: "13px",
              fontWeight: 900,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Zap size={16} />
            {isTriggering ? "Triggering..." : "⚡ Simulate Over-Cap Escalation ($120.00 RunPod GPU)"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {pending.map((esc) => (
        <EscalationCard
          key={esc.id}
          escalation={esc}
          onResolved={(id) => {
            setEscalations((prev) => prev.filter((item) => item.id !== id));
          }}
        />
      ))}
    </div>
  );
}

function EscalationCard({
  escalation: esc,
  onResolved,
}: {
  escalation: EscalationItem;
  onResolved: (id: string) => void;
}) {
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

  // Active countdown timer
  const [secondsLeft, setSecondsLeft] = useState(() => {
    return Math.max(0, Math.floor((new Date(esc.expiresAt).getTime() - Date.now()) / 1000));
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(esc.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, [esc.expiresAt]);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${hours > 0 ? `${hours}h ` : ""}${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  const isUrgent = secondsLeft < 900; // < 15 mins

  const amountDollars = (esc.purchaseRequest.amountCents / 100).toFixed(2);
  const capDollars = esc.perPurchaseCapCents ? (esc.perPurchaseCapCents / 100).toFixed(2) : null;

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveEscalation(esc.id, comment);
      if (result.success) {
        toast.success(
          result.message ?? `Approved! Real PayPal 2PC Hold placed (${result.authorizationId}).`,
          { duration: 6000, icon: "💳" }
        );
        onResolved(esc.id);
      } else {
        toast.error(result.error ?? "Failed to approve escalation.");
      }
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      const result = await rejectEscalation(esc.id, comment);
      if (result.success) {
        toast.success("Purchase request rejected. Zero funds moved.", {
          icon: "🛑",
        });
        onResolved(esc.id);
      } else {
        toast.error(result.error ?? "Failed to reject escalation.");
      }
    });
  };

  return (
    <div
      style={{
        background: "#ffffff",
        border: "var(--border-thick)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-base)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
      className="card animate-fade-in"
    >
      {/* Top Banner */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "var(--border-thick)",
          background: isUrgent ? "#fef2f2" : "#fef9c3",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "#121212",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldAlert size={18} color={isUrgent ? "#ef4444" : "#facc15"} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 900, color: "#121212", textTransform: "uppercase" }}>
                ESCALATION ID: {esc.id.slice(0, 8)}...
              </span>
              <span
                style={{
                  background: isUrgent ? "#fee2e2" : "#fef08a",
                  border: "1px solid #121212",
                  borderRadius: "var(--radius-pill)",
                  padding: "1px 8px",
                  fontSize: "10px",
                  fontWeight: 900,
                  color: isUrgent ? "#991b1b" : "#854d0e",
                }}
              >
                {isUrgent ? "CRITICAL SLA" : "PENDING REVIEW"}
              </span>
            </div>
            {esc.agentName && (
              <span style={{ fontSize: "12px", color: "#475569", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                <Bot size={13} /> {esc.agentName}
              </span>
            )}
          </div>
        </div>

        {/* SLA Countdown Timer */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            fontWeight: 800,
            color: isUrgent ? "#991b1b" : "#854d0e",
            background: "#ffffff",
            border: "1.5px solid #121212",
            borderRadius: "var(--radius-pill)",
            padding: "4px 12px",
            boxShadow: "1.5px 1.5px 0px #121212",
          }}
        >
          <Clock size={13} strokeWidth={2.5} />
          <span>SLA EXPIRES IN: <strong>{timeFormatted}</strong></span>
        </div>
      </div>

      {/* Main Body */}
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "18px" }}>
        {/* Item Header & Amount */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ fontSize: "19px", fontWeight: 900, color: "#121212", margin: 0 }}>
              {esc.purchaseRequest.itemName}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "13px", fontWeight: 800, color: "#4f46e5", display: "flex", alignItems: "center", gap: "4px" }}>
                <Store size={14} /> {esc.purchaseRequest.vendorName}
              </span>
              {esc.purchaseRequest.category && (
                <span
                  style={{
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: "var(--radius-pill)",
                    padding: "2px 8px",
                    fontSize: "11px",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  MCC {esc.purchaseRequest.category}
                </span>
              )}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "26px", fontWeight: 900, color: "#121212", fontVariantNumeric: "tabular-nums" }}>
              ${amountDollars} <span style={{ fontSize: "14px", color: "var(--color-ink-muted)" }}>{esc.purchaseRequest.currency}</span>
            </div>
            {capDollars && (
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#b45309" }}>
                Exceeds Single Cap of ${capDollars}
              </span>
            )}
          </div>
        </div>

        {/* Dual Justification Boxes */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
          {/* Agent Justification */}
          <div
            style={{
              background: "#f8faf5",
              border: "var(--border-medium)",
              borderRadius: "var(--radius-md)",
              padding: "14px 16px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", color: "#121212", marginBottom: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
              <span>🤖</span> <span>Agent Stated Justification</span>
            </div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#334155", margin: 0, lineHeight: 1.45 }}>
              "{esc.purchaseRequest.justification}"
            </p>
          </div>

          {/* Policy Engine Reasoning */}
          <div
            style={{
              background: "#fef2f2",
              border: "1.5px solid #f87171",
              borderRadius: "var(--radius-md)",
              padding: "14px 16px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", color: "#991b1b", marginBottom: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
              <span>⚖️</span> <span>Policy Violation Trigger</span>
            </div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#7f1d1d", margin: 0, lineHeight: 1.45 }}>
              {esc.leashReasoning}
            </p>
          </div>
        </div>

        {/* Operator Note Input */}
        <div>
          <label
            htmlFor={`comment-${esc.id}`}
            style={{
              display: "block",
              fontSize: "11px",
              fontWeight: 800,
              color: "#121212",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            Operator Decision Audit Note (Optional)
          </label>
          <input
            id={`comment-${esc.id}`}
            type="text"
            placeholder="e.g. Approved for critical Q4 data pipeline batch run..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isPending}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: "var(--radius-sm)",
              border: "var(--border-medium)",
              fontSize: "13px",
              fontWeight: 600,
            }}
          />
        </div>
      </div>

      {/* Decision Actions Bar */}
      <div
        style={{
          padding: "14px 24px",
          borderTop: "var(--border-thick)",
          background: "#f8faf5",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>
          🔒 Approving triggers a live 2PC hold on PayPal Sandbox using your Vault Token.
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={handleReject}
            disabled={isPending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 18px",
              background: "#fee2e2",
              color: "#991b1b",
              border: "1.5px solid #121212",
              borderRadius: "var(--radius-pill)",
              fontSize: "12.5px",
              fontWeight: 800,
              cursor: isPending ? "not-allowed" : "pointer",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <XCircle size={15} />
            <span>Reject Request</span>
          </button>

          <button
            onClick={handleApprove}
            disabled={isPending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 20px",
              background: "var(--neo-green)",
              color: "#121212",
              border: "1.5px solid #121212",
              borderRadius: "var(--radius-pill)",
              fontSize: "12.5px",
              fontWeight: 900,
              cursor: isPending ? "not-allowed" : "pointer",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <CheckCircle size={15} />
            <span>{isPending ? "Placing PayPal Hold..." : "Approve & Authorize (PayPal 2PC)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
