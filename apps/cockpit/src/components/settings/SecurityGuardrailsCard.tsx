"use client";

import { ShieldCheck, Database, Server, Lock, Cpu, CheckCircle2 } from "lucide-react";

export function SecurityGuardrailsCard() {
  const guardrails = [
    {
      title: "2-Phase Commit (2PC) Guardrail",
      status: "Active & Enforced",
      desc: "Every transaction starts as a PayPal Authorization hold. Funds are never captured without valid cryptographic proof-of-delivery.",
      icon: Lock,
      color: "var(--neo-green)",
      badgeColor: "#059669",
    },
    {
      title: "Ed25519 Cryptographic Verification",
      status: "Enforced",
      desc: "Mandates are cryptographically signed by the operator. The Policy Engine rejects any unsigned or tampered spending instruction.",
      icon: ShieldCheck,
      color: "var(--neo-purple)",
      badgeColor: "#4338ca",
    },
    {
      title: "PostgreSQL Database Engine",
      status: "Connected (Docker)",
      desc: "Container agent-leash-db running on port 5432 with Drizzle ORM schema migrations and WAL journaling.",
      icon: Database,
      color: "var(--neo-yellow)",
      badgeColor: "#854d0e",
    },
    {
      title: "Distributed Rate Limiter (Redis)",
      status: "Connected (Docker)",
      desc: "Container agent-leash-redis running on port 6379 enforcing per-minute velocity and replay protection.",
      icon: Cpu,
      color: "var(--neo-blue)",
      badgeColor: "#0369a1",
    },
  ];

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
          background: "var(--neo-pink)",
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
            <ShieldCheck size={22} color="#f472b6" strokeWidth={2.5} />
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
              GATEWAY SECURITY & SYSTEM HEALTH
            </h2>
            <p style={{ fontSize: "12px", color: "#831843", margin: "2px 0 0 0", fontWeight: 700 }}>
              Real-time security layers, policy compliance, and backend infrastructure
            </p>
          </div>
        </div>

        <span
          style={{
            background: "#ffffff",
            border: "1.5px solid #121212",
            padding: "3px 12px",
            borderRadius: "var(--radius-pill)",
            fontSize: "11px",
            fontWeight: 800,
            boxShadow: "1.5px 1.5px 0px #121212",
          }}
        >
          ALL SYSTEMS HEALTHY
        </span>
      </div>

      {/* Content Grid */}
      <div style={{ padding: "24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
          {guardrails.map((g, idx) => {
            const Icon = g.icon;
            return (
              <div
                key={idx}
                style={{
                  background: "#f8faf5",
                  border: "var(--border-medium)",
                  borderRadius: "var(--radius-md)",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  boxShadow: "var(--shadow-sm)",
                  transition: "transform 0.1s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: g.color,
                      border: "1.5px solid #121212",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={18} color="#121212" />
                  </div>
                  <span
                    style={{
                      background: "#ffffff",
                      border: "1px solid #121212",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-pill)",
                      fontSize: "10px",
                      fontWeight: 800,
                      color: g.badgeColor,
                    }}
                  >
                    {g.status}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#121212" }}>
                    {g.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--color-ink-muted)", marginTop: "4px", lineHeight: "1.4" }}>
                    {g.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
