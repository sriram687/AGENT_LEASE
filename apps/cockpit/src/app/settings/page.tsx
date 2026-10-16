import { Suspense } from "react";
import { PayPalVaultButton } from "@/components/wallet/PayPalVaultButton";
import { getVaultStatus } from "@/lib/actions/paypal";
import { Wallet, ShieldCheck, Key, RefreshCcw } from "lucide-react";

export const metadata = {
  title: "Settings & Wallet — Agent Leash",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const vaultStatus = await getVaultStatus();
  const clientId = process.env["PAYPAL_CLIENT_ID"] ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }} className="animate-fade-in">
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          background: "#ffffff",
          border: "var(--border-thick)",
          borderRadius: "var(--radius-lg)",
          padding: "20px 24px",
          boxShadow: "var(--shadow-base)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 900, color: "#121212", letterSpacing: "-0.02em", margin: 0 }}>
              SETTINGS & WALLET
            </h1>
            <span
              style={{
                background: "var(--neo-green)",
                border: "1.5px solid #121212",
                padding: "2px 10px",
                borderRadius: "var(--radius-pill)",
                fontSize: "11px",
                fontWeight: 800,
                boxShadow: "1.5px 1.5px 0px #121212",
              }}
            >
              PAYPAL SANDBOX
            </span>
          </div>
          <p style={{ fontSize: "14px", color: "var(--color-ink-muted)", margin: "4px 0 0 0" }}>
            Manage payment method authorization, cryptographic identity keys, and agent credentials.
          </p>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
        {/* Section 1: PayPal Vault Connection */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#121212", margin: 0 }}>
            1. Autonomous Payment Method
          </h2>
          <PayPalVaultButton
            initialConnected={vaultStatus.connected}
            initialVaultId={vaultStatus.vaultId}
            clientId={clientId}
          />
        </div>

        {/* Section 2: Security & Identity */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#121212", margin: 0 }}>
            2. Gateway Security Guardrails
          </h2>

          <div
            style={{
              background: "#ffffff",
              border: "var(--border-thick)",
              borderRadius: "var(--radius-lg)",
              padding: "24px",
              boxShadow: "var(--shadow-base)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "var(--neo-blue)",
                  border: "1.5px solid #121212",
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={20} color="#121212" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "14px", color: "#121212" }}>
                  Vault Token Isolation
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-ink-muted)", marginTop: "2px" }}>
                  The AI agent never sees your PayPal password or cards. Only the Leash Gateway holds your token.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "var(--neo-pink)",
                  border: "1.5px solid #121212",
                  flexShrink: 0,
                }}
              >
                <Key size={20} color="#121212" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "14px", color: "#121212" }}>
                  Two-Phase Commit (2PC)
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-ink-muted)", marginTop: "2px" }}>
                  Funds are held via PayPal Authorization and only captured when delivery proof is acknowledged.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
