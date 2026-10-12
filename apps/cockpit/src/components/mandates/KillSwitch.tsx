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
        className="rounded-xl border p-5 text-center"
        style={{ background: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.2)" }}
      >
        <ShieldOff size={24} color="#ef4444" className="mx-auto mb-2" />
        <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>
          Mandate revoked
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
          All open authorizations have been voided. No further spending is possible.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-5"
      style={{ background: "rgba(239,68,68,0.04)", borderColor: "rgba(239,68,68,0.15)" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "rgba(239,68,68,0.1)" }}
        >
          <ShieldOff size={18} color="#ef4444" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-200">Kill Switch</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            Immediately revokes this mandate and voids all{" "}
            <span style={{ color: "#fca5a5", fontWeight: 600 }}>
              {openAuthorizationsCount} open authorization{openAuthorizationsCount !== 1 ? "s" : ""}
            </span>
            . No additional charges will be possible.
          </p>
          <p className="text-xs mt-1 italic" style={{ color: "var(--color-text-muted)" }}>
            Mandate: {mandatePurpose}
          </p>
        </div>
      </div>

      {!showConfirm ? (
        <button
          id={`kill-switch-${mandateId}`}
          onClick={() => setShowConfirm(true)}
          className="kill-switch-btn mt-4 w-full"
        >
          Activate Kill Switch
        </button>
      ) : (
        <div className="mt-4 rounded-lg border p-4 animate-fade-in" style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} color="#fca5a5" />
              <p className="text-xs font-semibold" style={{ color: "#fca5a5" }}>
                This action is irreversible
              </p>
            </div>
            <button
              onClick={() => { setShowConfirm(false); setConfirmText(""); }}
              style={{ color: "var(--color-text-muted)" }}
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
            Type <strong style={{ color: "#fca5a5" }}>{CONFIRM_PHRASE}</strong> to confirm.
          </p>
          <input
            id={`kill-switch-confirm-${mandateId}`}
            type="text"
            className="input mb-3"
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
            className="w-full rounded-lg py-2.5 text-sm font-semibold transition-all"
            style={{
              background:
                confirmText === CONFIRM_PHRASE ? "#b91c1c" : "rgba(239,68,68,0.1)",
              color: confirmText === CONFIRM_PHRASE ? "#fef2f2" : "#ef4444",
              opacity: isPending ? 0.6 : 1,
              cursor: confirmText === CONFIRM_PHRASE ? "pointer" : "not-allowed",
            }}
          >
            {isPending ? "Revoking…" : "Confirm — Revoke Mandate"}
          </button>
        </div>
      )}
    </div>
  );
}
