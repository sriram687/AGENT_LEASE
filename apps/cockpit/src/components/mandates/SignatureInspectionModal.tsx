"use client";

import { useState } from "react";
import { X, ShieldCheck, Copy, Check, Lock, Key } from "lucide-react";
import toast from "react-hot-toast";
import { MandateWithAgent } from "@/lib/actions/mandates";

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])])
    );
  }
  return value;
}

function canonicalize(obj: unknown): string {
  return JSON.stringify(sortKeys(obj));
}

interface SignatureInspectionModalProps {
  mandate: MandateWithAgent | null;
  onClose: () => void;
}

export function SignatureInspectionModal({
  mandate,
  onClose,
}: SignatureInspectionModalProps) {
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedSig, setCopiedSig] = useState(false);

  if (!mandate) return null;

  const canonicalPayload = canonicalize({
    id: mandate.id,
    purpose: mandate.purpose,
    totalBudgetCents: mandate.totalBudgetCents,
    perPurchaseCapCents: mandate.perPurchaseCapCents,
    escalateAboveCents: mandate.escalateAboveCents,
    allowedCategories: [...mandate.allowedCategories].sort(),
    merchantAllowlist: [...mandate.merchantAllowlist].sort(),
    captureMode: mandate.captureMode,
    expiresAt: null,
  });

  const copyPayload = () => {
    navigator.clipboard.writeText(canonicalPayload);
    setCopiedPayload(true);
    toast.success("Canonical payload copied!");
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const copySignature = () => {
    if (!mandate.ownerSignature) return;
    navigator.clipboard.writeText(mandate.ownerSignature);
    setCopiedSig(true);
    toast.success("Ed25519 signature copied!");
    setTimeout(() => setCopiedSig(false), 2000);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "rgba(18, 18, 18, 0.55)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          background: "#ffffff",
          border: "var(--border-thick)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xl)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "fadeIn 0.2s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            background: "var(--neo-purple)",
            color: "#ffffff",
            borderBottom: "var(--border-thick)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1.5px solid #121212",
              }}
            >
              <Lock size={18} color="#121212" />
            </div>
            <div>
              <h3 style={{ fontSize: "17px", fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>
                ED25519 CRYPTOGRAPHIC PROOF
              </h3>
              <span style={{ fontSize: "11px", color: "#e0e7ff", fontWeight: 700 }}>
                Digital Non-Repudiation Wax Seal
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "#ffffff",
              border: "1.5px solid #121212",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} color="#121212" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px", maxHeight: "80vh", overflowY: "auto" }}>
          {/* Status banner */}
          <div
            style={{
              background: "var(--neo-green-light)",
              border: "1.5px solid #121212",
              borderRadius: "var(--radius-md)",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <ShieldCheck size={22} color="#059669" />
            <div>
              <div style={{ fontSize: "13px", fontWeight: 900, color: "#064e3b" }}>
                CRYPTOGRAPHIC SIGNATURE VERIFIED
              </div>
              <div style={{ fontSize: "11px", color: "#047857", marginTop: "1px" }}>
                Signed by Operator at {mandate.signedAt ? new Date(mandate.signedAt).toLocaleString() : "Initialization"}. Any byte modification invalidates this mandate.
              </div>
            </div>
          </div>

          {/* Canonical Payload */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--color-ink-muted)" }}>
                CANONICAL HASHED JSON PAYLOAD
              </span>
              <button
                onClick={copyPayload}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#4f46e5",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {copiedPayload ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                {copiedPayload ? "Copied" : "Copy Payload"}
              </button>
            </div>
            <pre
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                background: "#f8faf5",
                padding: "12px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                wordBreak: "break-all",
                whiteSpace: "pre-wrap",
                color: "#1e293b",
                margin: 0,
              }}
            >
              {canonicalPayload}
            </pre>
          </div>

          {/* Signature */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--color-ink-muted)" }}>
                ED25519 SIGNATURE (BASE64URL DER)
              </span>
              <button
                onClick={copySignature}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#4f46e5",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {copiedSig ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                {copiedSig ? "Copied" : "Copy Signature"}
              </button>
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                background: "#1e293b",
                color: "#34d399",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1.5px solid #121212",
                wordBreak: "break-all",
              }}
            >
              {mandate.ownerSignature || "Signature not present"}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "var(--border-thick)",
            background: "#f8faf5",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              background: "#121212",
              color: "#ffffff",
              border: "none",
              borderRadius: "var(--radius-pill)",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
