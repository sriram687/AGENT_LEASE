"use client";

import { useState, useTransition } from "react";
import { CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
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
      <div className="card flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle size={40} className="mb-3" style={{ color: "var(--color-approved)" }} />
        <p className="text-sm font-medium text-gray-300">All caught up</p>
        <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
          No purchase requests are waiting for your review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
    <div className="card-elevated rounded-xl overflow-hidden animate-fade-in">
      {/* Top accent bar */}
      <div className="h-1 w-full" style={{ background: "var(--color-escalated)" }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "rgba(245,158,11,0.1)" }}
            >
              <AlertTriangle size={16} color="#f59e0b" />
            </div>
            <div>
              <p className="font-semibold text-gray-100 text-sm">
                {esc.purchaseRequest.itemName}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                {esc.purchaseRequest.vendorName}
                {esc.purchaseRequest.category ? ` · ${esc.purchaseRequest.category}` : ""}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-lg font-semibold tabular-nums" style={{ color: "#fbbf24" }}>
              {amount}
            </p>
            <p className="text-xs flex items-center gap-1 justify-end mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              <Clock size={11} />
              Expires {expiresIn}
            </p>
          </div>
        </div>

        {/* Agent justification */}
        <div
          className="mt-4 rounded-lg p-3 text-xs"
          style={{ background: "var(--color-surface-0)", borderLeft: "3px solid var(--color-surface-3)", color: "var(--color-text-secondary)" }}
        >
          <p className="font-medium mb-1 uppercase tracking-wide text-gray-400" style={{ fontSize: "10px" }}>
            Agent justification
          </p>
          {esc.purchaseRequest.justification}
        </div>

        {/* Leash reasoning */}
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: "var(--color-text-muted)", fontSize: "10px" }}>
            Leash reasoning
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {esc.leashReasoning}
          </p>
        </div>

        {/* Risk flags */}
        {esc.decision?.llmRiskFlags && esc.decision.llmRiskFlags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {esc.decision.llmRiskFlags.map((flag) => (
              <span
                key={flag}
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ background: "rgba(239,68,68,0.08)", color: "#f87171" }}
              >
                {flag}
              </span>
            ))}
          </div>
        )}

        {/* Comment input */}
        <div className="mt-4">
          <label
            htmlFor={`comment-${esc.id}`}
            className="label"
          >
            Your comment (optional)
          </label>
          <textarea
            id={`comment-${esc.id}`}
            className="input resize-none"
            rows={2}
            placeholder="Add a note explaining your decision…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isPending}
          />
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-3">
          <button
            id={`approve-${esc.id}`}
            onClick={handleApprove}
            disabled={isPending}
            className="btn btn-sm flex items-center gap-1.5"
            style={{
              background: "rgba(34,197,94,0.1)",
              color: "#4ade80",
              border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: "8px",
              padding: "7px 16px",
              fontSize: "12.5px",
              fontWeight: 500,
            }}
          >
            <CheckCircle size={13} />
            Approve
          </button>
          <button
            id={`reject-${esc.id}`}
            onClick={handleReject}
            disabled={isPending}
            className="btn btn-sm flex items-center gap-1.5"
            style={{
              background: "rgba(239,68,68,0.08)",
              color: "#f87171",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "8px",
              padding: "7px 16px",
              fontSize: "12.5px",
              fontWeight: 500,
            }}
          >
            <XCircle size={13} />
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
