"use client";

import { useState } from "react";
import { Key, Copy, Check, Eye, EyeOff, Terminal, Sparkles, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";

interface AgentApiKeyCardProps {
  apiKey: string;
  gatewayUrl: string;
}

export function AgentApiKeyCard({ apiKey, gatewayUrl }: AgentApiKeyCardProps) {
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    toast.success("Agent API Key copied to clipboard!");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const curlSnippet = `curl -X POST "${gatewayUrl}/v1/payments/authorize" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "mandateId": "mnd_sample_01",
    "amountCents": 2499,
    "currency": "USD",
    "merchant": "AWS Cloud Services",
    "mcc": "7372",
    "purpose": "Server auto-scaling capacity"
  }'`;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlSnippet);
    setCopiedCurl(true);
    toast.success("cURL example copied to clipboard!");
    setTimeout(() => setCopiedCurl(false), 2000);
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
          background: "var(--neo-blue)",
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
            <Key size={22} color="#38bdf8" strokeWidth={2.5} />
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
              AGENT CREDENTIALS & API ACCESS
            </h2>
            <p style={{ fontSize: "12px", color: "#075985", margin: "2px 0 0 0", fontWeight: 700 }}>
              Bearer credential used by autonomous AI agents to request payments
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
          SCOPED BEARER
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Key Display Card */}
        <div
          style={{
            background: "#f8faf5",
            border: "1.5px solid #cbd5e1",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--color-ink-muted)" }}>
              LIVE AGENT API KEY
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => setShowKey(!showKey)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "var(--radius-pill)",
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                {showKey ? "Hide" : "Reveal"}
              </button>
              <button
                onClick={copyKey}
                style={{
                  background: "var(--neo-yellow)",
                  border: "1.5px solid #121212",
                  borderRadius: "var(--radius-pill)",
                  padding: "5px 14px",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {copiedKey ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                {copiedKey ? "Copied!" : "Copy Key"}
              </button>
            </div>
          </div>

          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              fontWeight: 600,
              color: "#1e293b",
              background: "#ffffff",
              padding: "10px 14px",
              borderRadius: "6px",
              border: "1px solid #e2e8f0",
              wordBreak: "break-all",
            }}
          >
            {showKey ? apiKey : `leash_sk_live_${"•".repeat(24)}`}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#64748b" }}>
            <span>Gateway Target:</span>
            <code style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#121212", background: "#ffffff", padding: "1px 6px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
              {gatewayUrl}
            </code>
          </div>
        </div>

        {/* cURL Usage Snippet */}
        <div
          style={{
            background: "#1e293b",
            borderRadius: "var(--radius-md)",
            border: "var(--border-thick)",
            boxShadow: "var(--shadow-base)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 16px",
              background: "#0f172a",
              borderBottom: "1px solid #334155",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#94a3b8", fontSize: "12px", fontWeight: 700 }}>
              <Terminal size={14} color="#38bdf8" />
              <span>TEST INVOCATION (AGENT 2PC PAYMENT REQUEST)</span>
            </div>
            <button
              onClick={copyCurl}
              style={{
                background: "transparent",
                border: "1px solid #475569",
                borderRadius: "var(--radius-pill)",
                color: "#e2e8f0",
                padding: "3px 10px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {copiedCurl ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
              {copiedCurl ? "Copied" : "Copy cURL"}
            </button>
          </div>
          <pre
            style={{
              padding: "14px 16px",
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "#34d399",
              lineHeight: "1.5",
              overflowX: "auto",
            }}
          >
            {curlSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
}
