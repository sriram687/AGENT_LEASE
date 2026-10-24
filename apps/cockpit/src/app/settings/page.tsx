import { Suspense } from "react";
import { getUserProfile, getAgentApiKey } from "@/lib/actions/user";
import { getVaultStatus } from "@/lib/actions/paypal";
import { OperatorProfileCard } from "@/components/settings/OperatorProfileCard";
import { AutonomousWalletCard } from "@/components/settings/AutonomousWalletCard";
import { AgentApiKeyCard } from "@/components/settings/AgentApiKeyCard";
import { SecurityGuardrailsCard } from "@/components/settings/SecurityGuardrailsCard";
import { Settings, ShieldCheck, User, Wallet, Key } from "lucide-react";

export const metadata = {
  title: "Profile & Settings — Agent Leash",
  description: "Manage Operator identity, PayPal Vault token, cryptographic keys, and agent access credentials.",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [profileRes, vaultStatus, keyRes] = await Promise.all([
    getUserProfile(),
    getVaultStatus(),
    getAgentApiKey(),
  ]);

  const profile = profileRes.user ?? {
    id: "default-operator",
    name: "Operator",
    email: "operator@agentleash.dev",
    role: "owner" as const,
    publicKey: null,
    vaultId: vaultStatus.vaultId ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const clientId = process.env["PAYPAL_CLIENT_ID"] ?? "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "28px",
        maxWidth: "1280px",
        margin: "0 auto",
      }}
      className="animate-fade-in"
    >
      {/* Top Banner */}
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
          padding: "22px 28px",
          boxShadow: "var(--shadow-base)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "var(--neo-yellow)",
              border: "var(--border-thick)",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Settings size={26} color="#121212" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h1
                style={{
                  fontSize: "24px",
                  fontWeight: 900,
                  color: "#121212",
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                PROFILE & OPERATOR SETTINGS
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
                PHASE 1 ACTIVE
              </span>
            </div>
            <p style={{ fontSize: "14px", color: "var(--color-ink-muted)", margin: "4px 0 0 0" }}>
              Configure administrator profile, Ed25519 signing keypair, PayPal Vault autonomous token, and scoped agent credentials.
            </p>
          </div>
        </div>

        {/* Quick status pill bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#f4f6f0",
              border: "1.5px solid #121212",
              padding: "4px 12px",
              borderRadius: "var(--radius-pill)",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: vaultStatus.connected ? "#10b981" : "#ef4444",
              }}
            />
            <span>Wallet: {vaultStatus.connected ? "Vaulted" : "Unlinked"}</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#f4f6f0",
              border: "1.5px solid #121212",
              padding: "4px 12px",
              borderRadius: "var(--radius-pill)",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            <ShieldCheck size={14} color="#059669" />
            <span>2PC & Ed25519 Active</span>
          </div>
        </div>
      </div>

      {/* Main Responsive Grid Layout */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Section 1: Operator Profile & Cryptographic Identity */}
        <OperatorProfileCard initialProfile={profile} />

        {/* Section 2: Autonomous PayPal Vault Wallet */}
        <AutonomousWalletCard
          initialConnected={vaultStatus.connected}
          initialVaultId={vaultStatus.vaultId ?? null}
          clientId={clientId}
        />

        {/* Section 3: Agent API Keys & Credentials */}
        <AgentApiKeyCard
          apiKey={keyRes.key}
          gatewayUrl={keyRes.gatewayUrl}
        />

        {/* Section 4: Security Guardrails & Health */}
        <SecurityGuardrailsCard />
      </div>
    </div>
  );
}
