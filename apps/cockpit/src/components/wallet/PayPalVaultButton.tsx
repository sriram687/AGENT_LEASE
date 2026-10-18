"use client";

import { useState, useEffect } from "react";
import { getPayPalAuthUrl, exchangePayPalCode, disconnectWallet } from "@/lib/actions/paypal";
import { CheckCircle2, Shield, Wallet, RefreshCw, Unlink, LogIn } from "lucide-react";
import toast from "react-hot-toast";

interface PayPalVaultButtonProps {
  initialConnected: boolean;
  initialVaultId?: string | undefined;
  clientId: string;
}

export function PayPalVaultButton({ initialConnected, initialVaultId, clientId }: PayPalVaultButtonProps) {
  const [connected, setConnected] = useState(initialConnected);
  const [vaultId, setVaultId] = useState(initialVaultId);
  const [loading, setLoading] = useState(false);

  // Handle return from PayPal OAuth redirect
  // PayPal redirects: /settings?vault=success&code=<AUTH_CODE>
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const result = params.get("vault");
    const code = params.get("code");

    if (result === "success" && code && !connected) {
      setLoading(true);
      toast.loading("Completing PayPal connection...", { id: "paypal-exchange" });
      exchangePayPalCode(code).then((res) => {
        toast.dismiss("paypal-exchange");
        if (res.success && res.refreshToken) {
          setConnected(true);
          setVaultId(res.refreshToken);
          toast.success(
            res.email
              ? `PayPal connected: ${res.email}`
              : "PayPal Wallet connected successfully!"
          );
        } else {
          toast.error("Connection failed: " + (res.error ?? "unknown error"));
        }
        setLoading(false);
        window.history.replaceState({}, "", "/settings");
      });
    } else if (result === "cancelled") {
      toast("PayPal connection was cancelled.", { icon: "❌" });
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      // Generate the PayPal OAuth Connect URL
      const res = await getPayPalAuthUrl();
      if (!res.success || !res.authUrl) {
        toast.error(res.error ?? "Failed to generate PayPal auth URL");
        setLoading(false);
        return;
      }

      // Open PayPal Login popup
      // URL: https://www.sandbox.paypal.com/connect?...&scope=futurepayments
      // User sees real PayPal login + consent screen — no special merchant setup needed
      const width = 500, height = 680;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        res.authUrl,
        "PayPalLogin",
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,status=no`
      );

      if (!popup) {
        // Popup blocked — full page redirect
        window.location.href = res.authUrl;
        return;
      }

      toast("Log in with your PayPal sandbox account in the popup...", {
        icon: "🔐", duration: 30000, id: "paypal-popup",
      });

      // Poll until PayPal redirects back to our domain with auth code
      const timer = setInterval(async () => {
        try {
          if (popup.closed) {
            clearInterval(timer);
            toast.dismiss("paypal-popup");
            toast.error("PayPal window was closed. Please try again.");
            setLoading(false);
            return;
          }

          // Will throw cross-origin error while on paypal.com — that is expected
          const href = popup.location.href;

          if (href.includes("/settings?vault=success")) {
            clearInterval(timer);
            toast.dismiss("paypal-popup");

            const popupParams = new URLSearchParams(popup.location.search);
            const code = popupParams.get("code");
            popup.close();

            if (!code) {
              toast.error("No authorization code received from PayPal.");
              setLoading(false);
              return;
            }

            toast.loading("Completing PayPal connection...", { id: "paypal-exchange" });
            const exchangeRes = await exchangePayPalCode(code);
            toast.dismiss("paypal-exchange");

            if (exchangeRes.success && exchangeRes.refreshToken) {
              setConnected(true);
              setVaultId(exchangeRes.refreshToken);
              toast.success(
                exchangeRes.email
                  ? `✅ PayPal connected: ${exchangeRes.email}`
                  : "✅ PayPal Wallet connected!"
              );
            } else {
              toast.error("Failed: " + (exchangeRes.error ?? "unknown"));
            }
            setLoading(false);

          } else if (href.includes("/settings?vault=cancelled")) {
            clearInterval(timer);
            toast.dismiss("paypal-popup");
            popup.close();
            toast("PayPal connection was cancelled.", { icon: "❌" });
            setLoading(false);
          }
        } catch (_) {
          // Still on paypal.com domain (cross-origin) — keep polling
          if (popup.closed) {
            clearInterval(timer);
            toast.dismiss("paypal-popup");
            toast.error("PayPal window closed. Please try again.");
            setLoading(false);
          }
        }
      }, 500);

    } catch (err: any) {
      toast.error(err.message ?? "Unexpected error");
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: "#ffffff",
      border: "var(--border-thick)",
      borderRadius: "var(--radius-lg)",
      padding: "24px",
      boxShadow: "var(--shadow-base)",
      maxWidth: "600px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: "44px", height: "44px", borderRadius: "10px",
          background: connected ? "var(--neo-green)" : "var(--neo-yellow)",
          border: "var(--border-medium)", boxShadow: "2px 2px 0px #121212",
        }}>
          {connected ? <CheckCircle2 size={24} color="#121212" /> : <Wallet size={24} color="#121212" />}
        </div>
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#121212", margin: 0 }}>
            {connected ? "PayPal Wallet Connected" : "Connect PayPal Wallet"}
          </h3>
          <p style={{ fontSize: "13px", color: "var(--color-ink-muted)", margin: "2px 0 0 0" }}>
            {connected
              ? "Autonomous payments authorized via PayPal OAuth."
              : "Log in with your PayPal sandbox account to authorize Agent Leash."}
          </p>
        </div>
      </div>

      {connected ? (
        <div style={{
          background: "#f0fdf4", border: "1.5px solid #86efac",
          borderRadius: "8px", padding: "16px",
          display: "flex", flexDirection: "column", gap: "10px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#15803d", fontSize: "13px", fontWeight: 700 }}>
            <Shield size={16} /> PayPal OAuth authorized — ready for autonomous payments
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "var(--font-mono)" }}>
            Token: {vaultId ? vaultId.slice(0, 24) + "..." : "active"}
          </div>
          <button
            onClick={async () => {
              const res = await disconnectWallet();
              if (res.success) {
                setConnected(false);
                setVaultId(undefined);
                toast("Wallet disconnected.", { icon: "🔌" });
              }
            }}
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
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <button
            id="paypal-connect-btn"
            onClick={handleConnect}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              width: "100%", padding: "14px 20px",
              background: loading ? "#94a3b8" : "#0070ba",
              color: "#ffffff", fontWeight: 800, fontSize: "15px",
              borderRadius: "var(--radius-md)", border: "var(--border-thick)",
              boxShadow: "var(--shadow-base)", cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {loading
              ? <><RefreshCw size={18} className="animate-spin" /> Connecting to PayPal...</>
              : <><LogIn size={18} /> Log In with PayPal</>
            }
          </button>

          <div style={{
            background: "#f0f9ff", border: "1.5px solid #bae6fd",
            borderRadius: "8px", padding: "12px 14px",
            fontSize: "12px", color: "#0369a1", lineHeight: "1.7",
          }}>
            <strong>How it works:</strong><br />
            1. A PayPal login popup opens<br />
            2. Log in with <code>sb-uxiyz53127082@personal.example.com</code><br />
            3. Click <strong>Agree</strong> to authorize Agent Leash<br />
            4. Your PayPal OAuth token is stored securely — your password is never shared
          </div>
        </div>
      )}
    </div>
  );
}
