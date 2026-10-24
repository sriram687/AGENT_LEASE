"use client";

import { useState } from "react";
import {
  Wallet,
  CheckCircle2,
  Copy,
  Check,
  Unlink,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Lock,
  Layers,
} from "lucide-react";
import toast from "react-hot-toast";
import { disconnectWallet } from "@/lib/actions/paypal";
import { PayPalVaultButton } from "@/components/wallet/PayPalVaultButton";

interface AutonomousWalletCardProps {
  initialConnected: boolean;
  initialVaultId: string | null;
  clientId: string;
}

export function AutonomousWalletCard({
  initialConnected,
  initialVaultId,
  clientId,
}: AutonomousWalletCardProps) {
  const [connected, setConnected] = useState(initialConnected);
  const [vaultId, setVaultId] = useState<string | null>(initialVaultId);
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const copyVaultToken = () => {
    if (!vaultId) return;
    navigator.clipboard.writeText(vaultId);
    setCopiedToken(true);
    toast.success("PayPal Vault token copied to clipboard!");
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        "Are you sure you want to disconnect this PayPal Vault wallet? AI agents will not be able to execute autonomous payments until reconnected."
      )
    ) {
      return;
    }

    setDisconnecting(true);
    const res = await disconnectWallet();
    setDisconnecting(false);

    if (res.success) {
      setConnected(false);
      setVaultId(null);
      toast("PayPal Vault wallet disconnected.", { icon: "🔌" });
    } else {
      toast.error(res.error ?? "Failed to disconnect wallet");
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
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "var(--border-thick)",
          background: "var(--neo-green-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#121212",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "2px 2px 0px rgba(0,0,0,0.15)",
            }}
          >
            <Wallet size={22} color="#34d399" strokeWidth={2.5} />
          </div>
          <div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 900,
                color: "#121212",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              AUTONOMOUS PAYPAL WALLET
            </h2>
            <p style={{ fontSize: "12px", color: "#064e3b", margin: "2px 0 0 0", fontWeight: 700 }}>
              Permanent Vault payment token used by Leash 2-Phase Commit Gateway
            </p>
          </div>
        </div>

        <div>
          {connected ? (
            <span
              style={{
                background: "var(--neo-green)",
                border: "1.5px solid #121212",
                padding: "4px 12px",
                borderRadius: "var(--radius-pill)",
                fontSize: "11px",
                fontWeight: 900,
                boxShadow: "1.5px 1.5px 0px #121212",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#047857",
                  display: "inline-block",
                }}
              />
              VAULT CONNECTED
            </span>
          ) : (
            <span
              style={{
                background: "#fecaca",
                border: "1.5px solid #121212",
                padding: "4px 12px",
                borderRadius: "var(--radius-pill)",
                fontSize: "11px",
                fontWeight: 900,
                color: "#991b1b",
              }}
            >
              NOT LINKED
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
        {connected && vaultId ? (
          <div
            style={{
              background: "#f0fdf4",
              border: "2px solid #86efac",
              borderRadius: "var(--radius-md)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle2 size={18} color="#059669" />
                  <span style={{ fontSize: "14px", fontWeight: 800, color: "#065f46" }}>
                    PayPal Vault Token Active
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#047857", marginTop: "2px" }}>
                  Authorized Sandbox Buyer: <strong>Tanshuk shop</strong>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={() => setShowToken(!showToken)}
                  style={{
                    padding: "6px 12px",
                    background: "#ffffff",
                    border: "1.5px solid #121212",
                    borderRadius: "var(--radius-pill)",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
                  {showToken ? "Hide" : "Reveal"}
                </button>
                <button
                  onClick={copyVaultToken}
                  style={{
                    padding: "6px 14px",
                    background: "#ffffff",
                    border: "1.5px solid #121212",
                    borderRadius: "var(--radius-pill)",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {copiedToken ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                  {copiedToken ? "Copied!" : "Copy Token"}
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  style={{
                    padding: "6px 12px",
                    background: "#fee2e2",
                    border: "1.5px solid #121212",
                    borderRadius: "var(--radius-pill)",
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "#991b1b",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Unlink size={13} /> {disconnecting ? "Disconnecting..." : "Disconnect"}
                </button>
              </div>
            </div>

            {/* Token Viewer */}
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                fontWeight: 700,
                color: "#1e293b",
                background: "#ffffff",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                wordBreak: "break-all",
              }}
            >
              {showToken ? vaultId : `${vaultId.slice(0, 4)}${"•".repeat(vaultId.length - 8)}${vaultId.slice(-4)}`}
            </div>

            <div style={{ fontSize: "12px", color: "#065f46", lineHeight: "1.5" }}>
              Stored securely in PostgreSQL. The Leash Gateway uses this token via PayPal Orders v2 with <code style={{ background: "#dcfce7", padding: "1px 5px", borderRadius: "4px", fontWeight: 700 }}>intent: "AUTHORIZE"</code> to hold escrow funds on every transaction.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                background: "#fef9c3",
                border: "2px solid #ca8a04",
                borderRadius: "var(--radius-md)",
                padding: "16px",
                fontSize: "13px",
                color: "#713f12",
              }}
            >
              <strong>No Autonomous Wallet Linked:</strong> To allow AI agents to reserve funds under your mandate limits, link a PayPal Sandbox Personal Account.
            </div>
            <PayPalVaultButton
              initialConnected={connected}
              initialVaultId={vaultId ?? undefined}
              clientId={clientId}
            />
          </div>
        )}

        {/* 2PC Architecture Visual Diagram */}
        <div
          style={{
            border: "1.5px solid #cbd5e1",
            borderRadius: "var(--radius-md)",
            background: "#f8faf5",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, fontSize: "13px", color: "#121212" }}>
            <Layers size={16} color="#4f46e5" />
            <span>HOW THE LEASH 2-PHASE COMMIT (2PC) WALLET WORKS</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
            }}
          >
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#6366f1" }}>PHASE 1: INTENT & HOLD</div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#121212", marginTop: "2px" }}>
                PayPal Authorization ($0 charged)
              </div>
              <div style={{ fontSize: "11px", color: "var(--color-ink-muted)", marginTop: "4px" }}>
                Funds are held on your card/balance. No payment is finalized until delivery is proven.
              </div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#f59e0b" }}>GATEWAY CHECK</div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#121212", marginTop: "2px" }}>
                Mandate Policy Verification
              </div>
              <div style={{ fontSize: "11px", color: "var(--color-ink-muted)", marginTop: "4px" }}>
                Policy engine checks Ed25519 signature, daily caps, MCC allowlist, and velocity.
              </div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#10b981" }}>PHASE 2: CAPTURE</div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#121212", marginTop: "2px" }}>
                Proof-of-Delivery Capture
              </div>
              <div style={{ fontSize: "11px", color: "var(--color-ink-muted)", marginTop: "4px" }}>
                Authorization captured only when valid API response / receipt hash is verified.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
