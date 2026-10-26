"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  ShieldCheck,
  Pause,
  Play,
  Trash2,
  Lock,
  Layers,
  Sparkles,
  ExternalLink,
  Clock,
  Tag,
  Store,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import {
  MandateWithAgent,
  toggleMandateStatus,
  resetMandateSpend,
} from "@/lib/actions/mandates";

interface MandateCardProps {
  mandate: MandateWithAgent;
  onInspectSignature: (mandate: MandateWithAgent) => void;
  onSimulate: (mandate: MandateWithAgent) => void;
  onOpenHolds?: (mandate: MandateWithAgent) => void;
  onStatusChanged?: () => void;
  onUpdated?: (updated?: Partial<MandateWithAgent> & { id: string }) => void;
}

export function MandateCard({
  mandate,
  onInspectSignature,
  onSimulate,
  onOpenHolds,
  onStatusChanged,
  onUpdated,
}: MandateCardProps) {
  const [status, setStatus] = useState(mandate.status);
  const [updating, setUpdating] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const spentDollars = (mandate.spentCents / 100).toFixed(2);
  const reservedDollars = (mandate.reservedCents / 100).toFixed(2);
  const totalDollars = (mandate.totalBudgetCents / 100).toFixed(2);
  const capDollars = (mandate.perPurchaseCapCents / 100).toFixed(2);
  const escalateDollars = (mandate.escalateAboveCents / 100).toFixed(2);

  const spentPct = Math.min(100, (mandate.spentCents / mandate.totalBudgetCents) * 100);
  const reservedPct = Math.min(
    100 - spentPct,
    (mandate.reservedCents / mandate.totalBudgetCents) * 100
  );

  const handleToggleStatus = async () => {
    const nextStatus = status === "active" ? "suspended" : "active";
    setUpdating(true);
    const res = await toggleMandateStatus(mandate.id, nextStatus);
    setUpdating(false);

    if (res.success) {
      setStatus(nextStatus);
      toast.success(
        `Mandate ${nextStatus === "active" ? "Resumed" : "Suspended"}.`,
        { icon: nextStatus === "active" ? "▶️" : "⏸️" }
      );
      if (onUpdated) onUpdated({ id: mandate.id, status: nextStatus });
      if (onStatusChanged) onStatusChanged();
    } else {
      toast.error(res.error ?? "Failed to update status");
    }
  };

  const copyMandateId = () => {
    navigator.clipboard.writeText(mandate.id);
    setCopiedId(true);
    toast.success("Mandate ID copied to clipboard!");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleResetSpend = async () => {
    if (!confirm("Reset this mandate's spend and escrow holds back to $0.00?")) return;
    const res = await resetMandateSpend(mandate.id);
    if (res.success) {
      toast.success("Mandate balance reset to $0.00!");
      if (onUpdated) onUpdated({ id: mandate.id, spentCents: 0, reservedCents: 0 });
      if (onStatusChanged) onStatusChanged();
    } else {
      toast.error(res.error ?? "Failed to reset balance");
    }
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
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      }}
      className="card"
    >
      {/* Top Banner */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "var(--border-thick)",
          background:
            status === "active"
              ? "var(--neo-yellow)"
              : status === "suspended"
              ? "#fef08a"
              : "#fecaca",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
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
              boxShadow: "1.5px 1.5px 0px rgba(0,0,0,0.2)",
            }}
          >
            <ShieldCheck size={18} color="#facc15" strokeWidth={2.5} />
          </div>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 900, color: "#121212", margin: 0 }}>
              {mandate.agentName}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
              <span style={{ fontSize: "11px", color: "#4b5563", fontFamily: "var(--font-mono)" }}>
                ID: {mandate.id.slice(0, 8)}...
              </span>
              <button
                onClick={copyMandateId}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#4b5563",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Copy full Mandate ID"
              >
                {copiedId ? <Check size={12} color="#059669" /> : <Copy size={12} />}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              background: "var(--neo-green-light)",
              color: "#064e3b",
              border: "1.5px solid #121212",
              padding: "2px 8px",
              borderRadius: "var(--radius-pill)",
              fontSize: "10px",
              fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            {mandate.captureMode === "on_delivery" ? "2PC ESCROW" : "IMMEDIATE"}
          </span>

          <span
            style={{
              background:
                status === "active"
                  ? "var(--neo-green)"
                  : status === "suspended"
                  ? "#f59e0b"
                  : "#ef4444",
              color: status === "active" ? "#121212" : "#ffffff",
              border: "1.5px solid #121212",
              padding: "2px 10px",
              borderRadius: "var(--radius-pill)",
              fontSize: "11px",
              fontWeight: 900,
              boxShadow: "1.5px 1.5px 0px #121212",
              textTransform: "uppercase",
            }}
          >
            {status}
          </span>
        </div>
      </div>

      {/* Body Content */}
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "18px", flex: 1 }}>
        {/* Purpose */}
        <div>
          <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--color-ink-muted)", textTransform: "uppercase" }}>
            MANDATE PURPOSE & SCOPE
          </span>
          <p
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#1e293b",
              margin: "4px 0 0 0",
              lineHeight: "1.5",
            }}
          >
            {mandate.purpose}
          </p>
        </div>

        {/* Live Spend Progress Meter */}
        <div
          style={{
            background: "#f8faf5",
            border: "1.5px solid #cbd5e1",
            borderRadius: "var(--radius-md)",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#121212" }}>
              BUDGET UTILIZATION
            </span>
            <span style={{ fontSize: "13px", fontWeight: 900, color: "#121212" }}>
              ${spentDollars} <span style={{ color: "var(--color-ink-muted)", fontWeight: 600 }}>/ ${totalDollars}</span>
            </span>
          </div>

          {/* Dual Multi-color Progress Bar */}
          <div
            style={{
              width: "100%",
              height: "12px",
              background: "#e2e8f0",
              borderRadius: "var(--radius-pill)",
              border: "1.5px solid #121212",
              overflow: "hidden",
              display: "flex",
            }}
          >
            <div
              style={{
                width: `${spentPct}%`,
                background: "var(--neo-green)",
                transition: "width 0.3s ease",
              }}
              title={`Spent: $${spentDollars}`}
            />
            <div
              onClick={() => mandate.reservedCents > 0 && onOpenHolds && onOpenHolds(mandate)}
              style={{
                width: `${reservedPct}%`,
                background: "var(--neo-blue)",
                transition: "width 0.3s ease",
                cursor: mandate.reservedCents > 0 ? "pointer" : "default",
              }}
              title={
                mandate.reservedCents > 0
                  ? `Click to view and capture $${reservedDollars} active hold`
                  : `Reserved in Escrow: $${reservedDollars}`
              }
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#64748b", flexWrap: "wrap", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--neo-green)", display: "inline-block", border: "1px solid #121212" }} />
              <span>Captured: ${spentDollars}</span>
            </div>

            {mandate.reservedCents > 0 ? (
              <button
                onClick={() => onOpenHolds && onOpenHolds(mandate)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  background: "var(--neo-blue-light)",
                  border: "1.5px solid var(--neo-blue)",
                  borderRadius: "var(--radius-pill)",
                  padding: "1px 8px",
                  cursor: "pointer",
                  color: "#1e40af",
                  fontWeight: 800,
                  fontSize: "11px",
                  transition: "transform 0.1s ease",
                }}
                title="Click to Open Active Holds Drawer & Confirm Delivery"
              >
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--neo-blue)", display: "inline-block", border: "1px solid #121212" }} />
                <span>Reserved: ${reservedDollars}</span>
                <span style={{ fontSize: "9px", background: "var(--neo-blue)", color: "#ffffff", padding: "1px 5px", borderRadius: "4px", fontWeight: 900 }}>
                  💸 Capture
                </span>
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--neo-blue)", display: "inline-block", border: "1px solid #121212" }} />
                <span>Reserved (Holds): ${reservedDollars}</span>
              </div>
            )}

            <div style={{ fontWeight: 700, color: "#121212" }}>
              Available: ${(mandate.availableCents / 100).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Financial Guardrails Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px 10px" }}>
            <span style={{ color: "var(--color-ink-muted)", fontSize: "11px", display: "block" }}>Single-Purchase Cap</span>
            <strong style={{ fontSize: "13px", color: "#121212" }}>${capDollars}</strong>
          </div>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px 10px" }}>
            <span style={{ color: "var(--color-ink-muted)", fontSize: "11px", display: "block" }}>Escalate Above</span>
            <strong style={{ fontSize: "13px", color: "#854d0e" }}>${escalateDollars}</strong>
          </div>
        </div>

        {/* Merchant & MCC Tags */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 800, color: "var(--color-ink-muted)" }}>
              <Tag size={12} />
              <span>ALLOWED MCC CATEGORIES</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "4px" }}>
              {mandate.allowedCategories.length > 0 ? (
                mandate.allowedCategories.map((mcc) => (
                  <span
                    key={mcc}
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
                    MCC {mcc}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: "11px", color: "#9ca3af" }}>All categories allowed</span>
              )}
            </div>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 800, color: "var(--color-ink-muted)" }}>
              <Store size={12} />
              <span>MERCHANT ALLOWLIST</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "4px" }}>
              {mandate.merchantAllowlist.length > 0 ? (
                mandate.merchantAllowlist.map((m) => (
                  <span
                    key={m}
                    style={{
                      background: "var(--neo-cream)",
                      border: "1px solid #121212",
                      borderRadius: "var(--radius-pill)",
                      padding: "2px 8px",
                      fontSize: "11px",
                      fontWeight: 800,
                    }}
                  >
                    {m}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: "11px", color: "#9ca3af" }}>Open merchant policy</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div
        style={{
          padding: "12px 20px",
          borderTop: "var(--border-thick)",
          background: "#f8faf5",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <button
          onClick={() => onInspectSignature(mandate)}
          style={{
            background: "transparent",
            border: "none",
            color: "#4f46e5",
            fontSize: "12px",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <Lock size={13} /> Inspect Ed25519
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Active 2PC Escrow Hold Capture Button */}
          {mandate.reservedCents > 0 && (
            <button
              onClick={() => onOpenHolds && onOpenHolds(mandate)}
              style={{
                padding: "5px 12px",
                background: "var(--neo-green)",
                border: "1.5px solid #121212",
                borderRadius: "var(--radius-pill)",
                fontSize: "12px",
                fontWeight: 900,
                color: "#121212",
                cursor: "pointer",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
              title="Click to open Active Holds Drawer & confirm capture"
            >
              💸 Confirm Delivery (${reservedDollars})
            </button>
          )}

          {/* Reset spend button if spend > 0 */}
          {(mandate.spentCents > 0 || mandate.reservedCents > 0) && (
            <button
              onClick={handleResetSpend}
              style={{
                padding: "5px 10px",
                background: "#fee2e2",
                border: "1.5px solid #121212",
                borderRadius: "var(--radius-pill)",
                fontSize: "11px",
                fontWeight: 800,
                color: "#991b1b",
                cursor: "pointer",
                boxShadow: "var(--shadow-sm)",
              }}
              title="Reset spend & holds to $0.00"
            >
              Reset ($0)
            </button>
          )}

          {/* Quick Simulate Button */}
          <button
            onClick={() => onSimulate(mandate)}
            style={{
              padding: "5px 12px",
              background: "#ffffff",
              border: "1.5px solid #121212",
              borderRadius: "var(--radius-pill)",
              fontSize: "12px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Sparkles size={12} color="#f59e0b" /> Simulate Test
          </button>

          {/* Pause / Resume Button */}
          <button
            onClick={handleToggleStatus}
            disabled={updating || status === "revoked"}
            style={{
              padding: "5px 12px",
              background: status === "active" ? "#fef08a" : "var(--neo-green)",
              border: "1.5px solid #121212",
              borderRadius: "var(--radius-pill)",
              fontSize: "12px",
              fontWeight: 800,
              cursor: status === "revoked" ? "not-allowed" : "pointer",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {status === "active" ? <Pause size={12} /> : <Play size={12} />}
            {status === "active" ? "Pause" : "Resume"}
          </button>
        </div>
      </div>
    </div>
  );
}
