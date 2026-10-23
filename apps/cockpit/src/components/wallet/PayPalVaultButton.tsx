"use client";

import { useState, useEffect, useCallback } from "react";
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import {
  createVaultOrder,
  confirmVaultOrder,
  disconnectWallet,
} from "@/lib/actions/paypal";
import { CheckCircle2, Shield, Wallet, RefreshCw, Unlink, Key } from "lucide-react";
import toast from "react-hot-toast";

// ─── Inner button (has access to PayPal SDK context) ─────────────────────────

function VaultButtons({
  onConnected,
}: {
  onConnected: (tokenId: string, email?: string) => void;
}) {
  const [{ isPending }] = usePayPalScriptReducer();
  const [creating, setCreating] = useState(false);

  const createOrder = useCallback(async () => {
    setCreating(true);
    const res = await createVaultOrder();
    setCreating(false);
    if (!res.success || !res.orderId) {
      toast.error("PayPal Error: " + (res.error ?? "Could not create order"));
      throw new Error(res.error ?? "no order id");
    }
    return res.orderId;
  }, []);

  const onApprove = useCallback(
    async (data: { orderID: string }) => {
      toast.loading("Authorizing PayPal wallet...", { id: "vault-confirm" });
      const res = await confirmVaultOrder(data.orderID);
      toast.dismiss("vault-confirm");

      if (res.success && res.vaultId) {
        toast.success(
          res.email
            ? `✅ PayPal connected: ${res.email}`
            : "✅ PayPal Wallet connected!"
        );
        onConnected(res.vaultId, res.email);
      } else {
        toast.error("Connection failed: " + (res.error ?? "unknown error"));
      }
    },
    [onConnected]
  );

  if (isPending || creating) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          padding: "14px",
          background: "#94a3b8",
          borderRadius: "8px",
          color: "#fff",
          fontWeight: 700,
          fontSize: "15px",
        }}
      >
        <RefreshCw size={18} className="animate-spin" />
        Loading PayPal...
      </div>
    );
  }

  return (
    <PayPalButtons
      style={{
        layout: "vertical",
        color: "blue",
        shape: "rect",
        label: "paypal",
        height: 48,
      }}
      fundingSource="paypal"
      createOrder={createOrder}
      onApprove={onApprove}
      onError={(err) => {
        console.error("[PayPalButtons] onError", err);
        toast.error("PayPal encountered an error. Please try again.");
      }}
      onCancel={() => {
        toast("PayPal connection was cancelled.", { icon: "❌" });
      }}
    />
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface PayPalVaultButtonProps {
  initialConnected: boolean;
  initialVaultId?: string | undefined;
  clientId: string;
}

export function PayPalVaultButton({
  initialConnected,
  initialVaultId,
  clientId,
}: PayPalVaultButtonProps) {
  const [connected, setConnected] = useState(initialConnected);
  const [vaultId, setVaultId] = useState(initialVaultId);

  // Handle redirect-back from PayPal (fallback for popup-blocked scenario)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const result = params.get("vault");
    const token = params.get("token");
    const email = params.get("email");

    if (result === "success" && token && !connected) {
      setConnected(true);
      setVaultId(token);
      toast.success(email ? `✅ PayPal connected: ${email}` : "✅ PayPal Wallet connected!");
      window.history.replaceState({}, "", "/settings");
    } else if (result === "cancelled") {
      toast("PayPal connection was cancelled.", { icon: "❌" });
      window.history.replaceState({}, "", "/settings");
    } else if (result === "error") {
      const reason = params.get("reason") ?? "unknown error";
      toast.error("PayPal Error: " + reason);
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  const handleConnected = useCallback((tokenId: string, email?: string) => {
    setConnected(true);
    setVaultId(tokenId);
  }, []);

  const handleDisconnect = async () => {
    const res = await disconnectWallet();
    if (res.success) {
      setConnected(false);
      setVaultId(undefined);
      toast("Wallet disconnected.", { icon: "🔌" });
    }
  };

  // ─── Connected state ────────────────────────────────────────────────────────
  if (connected && vaultId) {
    return (
      <div
        style={{
          background: "#ffffff",
          border: "var(--border-thick)",
          borderRadius: "var(--radius-lg)",
          padding: "24px",
          boxShadow: "var(--shadow-base)",
          maxWidth: "600px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "44px", height: "44px", borderRadius: "10px",
              background: "var(--neo-green)",
              border: "var(--border-medium)", boxShadow: "2px 2px 0px #121212",
            }}
          >
            <CheckCircle2 size={24} color="#121212" />
          </div>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#121212", margin: 0 }}>
              PayPal Wallet Connected
            </h3>
            <p style={{ fontSize: "13px", color: "var(--color-ink-muted)", margin: "2px 0 0 0" }}>
              Autonomous payments authorized via PayPal Vault.
            </p>
          </div>
        </div>

        {/* Status card */}
        <div
          style={{
            background: "#f0fdf4", border: "1.5px solid #86efac",
            borderRadius: "8px", padding: "16px",
            display: "flex", flexDirection: "column", gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#15803d", fontSize: "13px", fontWeight: 700 }}>
            <Shield size={16} /> PayPal Vault authorized — AI agents can transact autonomously
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "11px", fontFamily: "var(--font-mono)" }}>
            <Key size={12} /> Vault Token: {vaultId.slice(0, 28)}...
          </div>
          <button
            onClick={handleDisconnect}
            style={{
              marginTop: "4px", alignSelf: "flex-start",
              background: "transparent", border: "none",
              color: "#dc2626", fontSize: "12px", fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", gap: "4px",
            }}
          >
            <Unlink size={13} /> Disconnect Wallet
          </button>
        </div>
      </div>
    );
  }

  // ─── Not connected — show PayPal buttons ────────────────────────────────────
  return (
    <div
      style={{
        background: "#ffffff",
        border: "var(--border-thick)",
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        boxShadow: "var(--shadow-base)",
        maxWidth: "600px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "44px", height: "44px", borderRadius: "10px",
            background: "var(--neo-yellow)",
            border: "var(--border-medium)", boxShadow: "2px 2px 0px #121212",
          }}
        >
          <Wallet size={24} color="#121212" />
        </div>
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#121212", margin: 0 }}>
            Connect PayPal Wallet
          </h3>
          <p style={{ fontSize: "13px", color: "var(--color-ink-muted)", margin: "2px 0 0 0" }}>
            Authorize Agent Leash to manage payments autonomously via PayPal Vault.
          </p>
        </div>
      </div>

      {/* PayPal SDK Buttons */}
      <PayPalScriptProvider
        options={{
          clientId: clientId,
          components: "buttons",
          intent: "authorize",
          currency: "USD",
        }}
      >
        <VaultButtons onConnected={handleConnected} />
      </PayPalScriptProvider>

      {/* Info box */}
      <div
        style={{
          marginTop: "16px",
          background: "#f0f9ff", border: "1.5px solid #bae6fd",
          borderRadius: "8px", padding: "12px 14px",
          fontSize: "12px", color: "#0369a1", lineHeight: "1.7",
        }}
      >
        <strong>How it works:</strong><br />
        1. Click the PayPal button above<br />
        2. Log in with your sandbox buyer account<br />
        &nbsp;&nbsp;&nbsp;<code style={{ fontSize: "11px" }}>sb-km043r53470321@business.example.com</code><br />
        &nbsp;&nbsp;&nbsp;Password: <code style={{ fontSize: "11px" }}>ChlzY_K8</code><br />
        3. Authorize Agent Leash to use this wallet<br />
        4. Your PayPal Vault token is stored securely — your password is never shared
      </div>
    </div>
  );
}
