"use client";

import { useState, useTransition } from "react";
import { ShieldOff, AlertTriangle, X } from "lucide-react";
import { revokeMandate } from "@/lib/actions/mandates";
import toast from "react-hot-toast";

interface KillSwitchProps {
  mandateId: string;
  mandatePurpose: string;
  openAuthorizationsCount: number;
}

export function KillSwitch({
  mandateId,
  mandatePurpose,
  openAuthorizationsCount,
}: KillSwitchProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [revoked, setRevoked] = useState(false);

  const CONFIRM_PHRASE = "REVOKE";

  const handleRevoke = () => {
    if (confirmText !== CONFIRM_PHRASE) return;
    startTransition(async () => {
      const result = await revokeMandate(mandateId);
      if (result.success) {
        toast.success(
          `Mandate revoked. ${openAuthorizationsCount} authorization(s) voided.`,
          { duration: 6000 }
        );
        setRevoked(true);
        setShowConfirm(false);
      } else {
        toast.error(result.error ?? "Revocation failed.");
      }
    });
  };

  if (revoked) {
    return (
      <div
        className="card"
        style={{
          background: "#fee2e2",
          border: "var(--border-thick)",
          borderRadius: "var(--radius-lg)",
          padding: "24px",
          textAlign: "center",
          boxShadow: "var(--shadow-base)",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "#ffffff",
            border: "var(--border-medium)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px",
          }}
        >
          <ShieldOff size={24} color="#dc2626" strokeWidth={2.5} />
        </div>
        <p style={{ fontSize: "16px", fontWeight: 900, color: "#991b1b" }}>
          MANDATE REVOKED
        </p>
        <p style={{ fontSize: "12px", fontWeight: 600, color: "#7f1d1d", marginTop: "4px" }}>
          All open authorizations have been voided. No further spending is possible.
        </p>
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{
        background: "#ffffff",
        border: "var(--border-thick)",
        borderRadius: "var(--radius-lg)",
        padding: "20px",
        boxShadow: "var(--shadow-base)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            background: "#fee2e2",
            border: "var(--border-medium)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <ShieldOff size={20} color="#dc2626" strokeWidth={2.5} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <p style={{ fontSize: "15px", fontWeight: 900, color: "#121212" }}>KILL SWITCH</p>
            <span
              style={{
                background: "#fee2e2",
                color: "#991b1b",
                border: "1px solid #121212",
                borderRadius: "var(--radius-pill)",
                padding: "1px 8px",
                fontSize: "10px",
                fontWeight: 800,
              }}
            >
              HIGH IMPACT
            </span>
          </div>
          <p style={{ fontSize: "12px", fontWeight: 500, color: "#4b5563", marginTop: "3px" }}>
            Immediately revokes this mandate and voids all{" "}
            <span style={{ color: "#dc2626", fontWeight: 800 }}>
              {openAuthorizationsCount} open authorization{openAuthorizationsCount !== 1 ? "s" : ""}
            </span>
            .
          </p>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", marginTop: "4px" }}>
            Mandate: {mandatePurpose}
          </p>
        </div>
      </div>

      {!showConfirm ? (
        <button
          id={`kill-switch-${mandateId}`}
          onClick={() => setShowConfirm(true)}
          className="kill-switch-btn"
          style={{ marginTop: "16px", width: "100%" }}
        >
          Activate Kill Switch
        </button>
      ) : (
        <div
          style={{
            marginTop: "16px",
            borderRadius: "var(--radius-md)",
            border: "var(--border-medium)",
            padding: "16px",
            background: "#fff1f2",
            boxShadow: "var(--shadow-sm)",
          }}
          className="animate-fade-in"
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <AlertTriangle size={15} color="#b91c1c" strokeWidth={2.5} />
              <p style={{ fontSize: "12px", fontWeight: 800, color: "#991b1b" }}>
                THIS ACTION IS IRREVERSIBLE
              </p>
            </div>
            <button
              onClick={() => { setShowConfirm(false); setConfirmText(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563", marginBottom: "10px" }}>
            Type <strong style={{ color: "#b91c1c" }}>{CONFIRM_PHRASE}</strong> to confirm:
          </p>
          <input
            id={`kill-switch-confirm-${mandateId}`}
            type="text"
            className="input"
            style={{ marginBottom: "12px" }}
            placeholder={CONFIRM_PHRASE}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            id={`kill-switch-execute-${mandateId}`}
            onClick={handleRevoke}
            disabled={confirmText !== CONFIRM_PHRASE || isPending}
            className="btn btn-danger"
            style={{ width: "100%", padding: "10px", fontSize: "13px" }}
          >
            {isPending ? "Revoking…" : "Confirm — Revoke Mandate"}
          </button>
        </div>
      )}
    </div>
  );
}
