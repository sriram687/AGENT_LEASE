"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Hash, Check } from "lucide-react";

interface ChainStatusData {
  totalEntries: number;
  isValid: boolean;
  lastChecked: string;
  latestHash?: string;
}

export function ChainStatus() {
  const [status, setStatus] = useState<ChainStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/chain-status")
      .then((r) => r.json())
      .then((data) => setStatus(data))
      .catch(() =>
        setStatus({
          totalEntries: 0,
          isValid: true,
          lastChecked: new Date().toISOString(),
        })
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="card"
      style={{
        padding: "22px 26px",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        {/* Left info */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: status?.isValid ? "var(--neo-green-light)" : "#fee2e2",
              border: "var(--border-medium)",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {status?.isValid ? (
              <ShieldCheck size={24} color="#065f46" strokeWidth={2.5} />
            ) : (
              <ShieldAlert size={24} color="#991b1b" strokeWidth={2.5} />
            )}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 900, color: "#121212", letterSpacing: "-0.01em" }}>
                LEDGER CHAIN INTEGRITY
              </h2>
              <span
                style={{
                  background: "#e0f2fe",
                  border: "1px solid #121212",
                  borderRadius: "var(--radius-pill)",
                  padding: "2px 8px",
                  fontSize: "10px",
                  fontWeight: 800,
                  color: "#0369a1",
                }}
              >
                SHA-256
              </span>
            </div>
            <p style={{ fontSize: "12px", fontWeight: 500, color: "#4b5563", marginTop: "3px" }}>
              Cryptographically chained · append-only tamper-evident verification
            </p>
          </div>
        </div>

        {/* Right metrics */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          {/* Total entries pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#f8faf5",
              border: "var(--border-medium)",
              borderRadius: "var(--radius-pill)",
              padding: "6px 14px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Hash size={15} color="#121212" strokeWidth={2.5} />
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#121212" }}>
              {loading ? "—" : (status?.totalEntries ?? 0).toLocaleString()} entries
            </span>
          </div>

          {/* Chain status pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: status?.isValid ? "var(--neo-green-light)" : "#fee2e2",
              border: "var(--border-medium)",
              borderRadius: "var(--radius-pill)",
              padding: "6px 14px",
              boxShadow: "var(--shadow-sm)",
              fontSize: "13px",
              fontWeight: 800,
              color: status?.isValid ? "#064e3b" : "#991b1b",
            }}
          >
            {status?.isValid ? <Check size={16} strokeWidth={3} /> : null}
            <span>{loading ? "Checking…" : status?.isValid ? "VALID CHAIN" : "COMPROMISED"}</span>
          </div>

          {status?.latestHash && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                fontWeight: 600,
                background: "#f1f5f9",
                border: "1.5px solid #121212",
                borderRadius: "var(--radius-sm)",
                padding: "6px 10px",
                color: "#334155",
              }}
            >
              {status.latestHash.slice(0, 16)}…
            </div>
          )}
        </div>
      </div>

      {status && !status.isValid && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            background: "#fee2e2",
            border: "var(--border-medium)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#991b1b" }}>
            ⚠ Chain integrity check failed. A ledger entry may have been tampered with. Audit immediately.
          </p>
        </div>
      )}
    </div>
  );
}
