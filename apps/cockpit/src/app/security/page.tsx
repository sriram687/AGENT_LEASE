import { SecuritySuite } from "@/components/security/SecuritySuite";
import { StatCard } from "@/components/dashboard/StatCard";
import { Shield, ShieldAlert, ShieldCheck, Key, Lock, CheckCircle2 } from "lucide-react";

export const metadata = { title: "Security & Adversarial Defense — Agent Leash" };
export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="animate-fade-in">
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
            <h1 style={{ fontSize: "24px", fontWeight: 900, color: "#121212", letterSpacing: "-0.02em" }}>
              SECURITY & ADVERSARIAL DEFENSE
            </h1>
            <span
              style={{
                background: "var(--neo-green-light)",
                border: "1.5px solid #121212",
                padding: "2px 10px",
                borderRadius: "var(--radius-pill)",
                fontSize: "11px",
                fontWeight: 800,
                boxShadow: "1.5px 1.5px 0px #121212",
                color: "#064e3b",
              }}
            >
              SECURED
            </span>
          </div>
          <p style={{ fontSize: "13px", fontWeight: 500, color: "#4b5563", marginTop: "4px" }}>
            Zero-trust cryptographic isolation, prompt injection screening, and velocity structuring defenses.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--neo-yellow)",
            border: "var(--border-medium)",
            borderRadius: "var(--radius-pill)",
            padding: "8px 16px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <Key size={16} strokeWidth={2.5} color="#121212" />
          <span style={{ fontSize: "12px", fontWeight: 800, color: "#121212" }}>
            Ed25519 RECEIPT SIGNING ACTIVE
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "18px",
        }}
      >
        <StatCard
          label="Defense Posture"
          value="4 Layers"
          sub="Deterministic + Dedup + LLM + Screen"
          color="brand"
          icon={<Shield size={16} color="#121212" strokeWidth={2.5} />}
        />
        <StatCard
          label="Adversarial Benchmark"
          value="23 / 23"
          sub="100% test pass rate"
          color="green"
          icon={<CheckCircle2 size={16} color="#121212" strokeWidth={2.5} />}
        />
        <StatCard
          label="Payment Hold Isolation"
          value="2PC Vault"
          sub="Holds funds before capture"
          color="amber"
          icon={<Lock size={16} color="#121212" strokeWidth={2.5} />}
        />
        <StatCard
          label="Tamper Detection"
          value="0 Breaches"
          sub="Immutable SHA-256 chained"
          color="violet"
          icon={<ShieldCheck size={16} color="#121212" strokeWidth={2.5} />}
        />
      </div>

      {/* Security Suite Interactive Section */}
      <SecuritySuite />
    </div>
  );
}
