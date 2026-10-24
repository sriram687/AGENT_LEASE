"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  ArrowRight,
  ShieldAlert,
  CreditCard,
  Send,
} from "lucide-react";
import {
  MandateWithAgent,
  simulateMandateCheck,
  executeMandateTransaction,
} from "@/lib/actions/mandates";

interface MandateSimulatorModalProps {
  mandate: MandateWithAgent | null;
  onClose: () => void;
  onUpdated?: (updated?: Partial<MandateWithAgent> & { id: string }) => void;
}

export function MandateSimulatorModal({
  mandate,
  onClose,
  onUpdated,
}: MandateSimulatorModalProps) {
  const [amount, setAmount] = useState("18.50");
  const [merchant, setMerchant] = useState("AWS Cloud Services");
  const [mcc, setMcc] = useState("7372");
  const [purpose, setPurpose] = useState("Auto-scaling server instances for data pipeline");
  const [running, setRunning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (!mandate) return null;

  const handleRunSimulation = async (
    customAmt?: string,
    customMerchant?: string,
    customMcc?: string,
    customPurpose?: string
  ) => {
    const amtVal = customAmt ?? amount;
    const merchVal = customMerchant ?? merchant;
    const mccVal = customMcc ?? mcc;
    const purpVal = customPurpose ?? purpose;

    const amountCents = Math.round(parseFloat(amtVal) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setRunning(true);
    setResult(null);

    const res = await simulateMandateCheck({
      mandateId: mandate.id,
      amountCents,
      merchant: merchVal,
      mcc: mccVal,
      purpose: purpVal,
    });

    setRunning(false);
    setResult(res);
  };

  const handleExecute = async (actionType: "hold" | "capture") => {
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      toast.error("Invalid amount");
      return;
    }

    setExecuting(true);
    const res = await executeMandateTransaction({
      mandateId: mandate.id,
      amountCents,
      merchant,
      mcc,
      purpose,
      actionType,
    });
    setExecuting(false);

    if (res.success) {
      toast.success(res.reason, { duration: 5000, icon: actionType === "hold" ? "💳" : "💸" });
      if (onUpdated) {
        onUpdated({
          id: mandate.id,
          ...(typeof res.spentCents === "number" ? { spentCents: res.spentCents } : {}),
          ...(typeof res.reservedCents === "number" ? { reservedCents: res.reservedCents } : {}),
        });
      }
      onClose();
    } else {
      toast.error(res.reason ?? "Transaction execution failed");
    }
  };

  const loadPreset = (preset: "valid" | "escalate" | "block") => {
    if (preset === "valid") {
      setAmount("18.50");
      setMerchant("AWS Cloud Services");
      setMcc("7372");
      setPurpose("Auto-scaling server instances for data pipeline");
      handleRunSimulation("18.50", "AWS Cloud Services", "7372", "Auto-scaling server instances for data pipeline");
    } else if (preset === "escalate") {
      setAmount("120.00");
      setMerchant("RunPod GPU Cloud");
      setMcc("7372");
      setPurpose("A100 GPU cluster reservation for model fine-tuning");
      handleRunSimulation("120.00", "RunPod GPU Cloud", "7372", "A100 GPU cluster reservation for model fine-tuning");
    } else {
      setAmount("45.00");
      setMerchant("Delta Air Lines");
      setMcc("4722");
      setPurpose("Personal flight booking");
      handleRunSimulation("45.00", "Delta Air Lines", "4722", "Personal flight booking");
    }
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
          maxWidth: "640px",
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
            background: "var(--neo-yellow)",
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
                background: "#121212",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={18} color="#facc15" />
            </div>
            <div>
              <h3 style={{ fontSize: "17px", fontWeight: 900, color: "#121212", margin: 0 }}>
                POLICY ENGINE TEST SIMULATOR
              </h3>
              <span style={{ fontSize: "11px", color: "#4b5563", fontWeight: 700 }}>
                Target: {mandate.agentName}
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
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", maxHeight: "80vh", overflowY: "auto" }}>
          {/* Quick Presets */}
          <div>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--color-ink-muted)", textTransform: "uppercase" }}>
              TEST WITH 1-CLICK SCENARIOS:
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px", marginTop: "6px" }}>
              <button
                type="button"
                onClick={() => loadPreset("valid")}
                style={{
                  padding: "8px 12px",
                  background: "#f0fdf4",
                  border: "1.5px solid #16a34a",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "#166534",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                ✅ 1. Approved ($18.50 AWS)
              </button>
              <button
                type="button"
                onClick={() => loadPreset("escalate")}
                style={{
                  padding: "8px 12px",
                  background: "#fef9c3",
                  border: "1.5px solid #ca8a04",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "#854d0e",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                ⚠️ 2. Over Cap ($120 RunPod)
              </button>
              <button
                type="button"
                onClick={() => loadPreset("block")}
                style={{
                  padding: "8px 12px",
                  background: "#fee2e2",
                  border: "1.5px solid #dc2626",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "#991b1b",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                🛑 3. Forbidden (Delta Airlines)
              </button>
            </div>
          </div>

          {/* Custom Input Form */}
          <div
            style={{
              background: "#f8faf5",
              border: "1.5px solid #cbd5e1",
              borderRadius: "var(--radius-md)",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 800, marginBottom: "4px" }}>
                  AMOUNT ($ USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "var(--border-medium)",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 800, marginBottom: "4px" }}>
                  MERCHANT NAME
                </label>
                <input
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "var(--border-medium)",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 800, marginBottom: "4px" }}>
                  MCC CODE
                </label>
                <input
                  type="text"
                  value={mcc}
                  onChange={(e) => setMcc(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "var(--border-medium)",
                    fontSize: "13px",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 800, marginBottom: "4px" }}>
                  TRANSACTION PURPOSE
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "var(--border-medium)",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "10px", marginTop: "6px" }}>
              <button
                type="button"
                onClick={() => handleExecute("hold")}
                disabled={executing || running}
                style={{
                  padding: "10px",
                  background: "var(--neo-green)",
                  color: "#121212",
                  border: "var(--border-medium)",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: "var(--shadow-sm)",
                  fontSize: "13px",
                  fontWeight: 900,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <CreditCard size={15} />
                {executing ? "Placing PayPal Hold..." : `⚡ PayPal 2PC Hold ($${amount})`}
              </button>

              <button
                type="button"
                onClick={() => handleRunSimulation()}
                disabled={running || executing}
                style={{
                  padding: "10px",
                  background: "#ffffff",
                  color: "#121212",
                  border: "var(--border-medium)",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: "var(--shadow-sm)",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <Play size={14} /> {running ? "Evaluating..." : "🔍 Dry-Run Advice Only"}
              </button>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "6px 10px",
                background: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 700,
                color: "#166534",
              }}
            >
              <span>🟢</span>
              <span>
                <strong>100% Real PayPal Sandbox</strong>: Holds & Captures execute live via Vault Token <code>1gm62276cp965960w</code>.
              </span>
            </div>
          </div>

          {/* Simulation Output */}
          {result && (
            <div
              style={{
                background:
                  result.decision === "ALLOW"
                    ? "#f0fdf4"
                    : result.decision === "ESCALATE"
                    ? "#fef9c3"
                    : "#fee2e2",
                border: `2px solid ${
                  result.decision === "ALLOW"
                    ? "#16a34a"
                    : result.decision === "ESCALATE"
                    ? "#ca8a04"
                    : "#dc2626"
                }`,
                borderRadius: "var(--radius-md)",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                animation: "fadeIn 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {result.decision === "ALLOW" && <CheckCircle2 size={20} color="#16a34a" />}
                  {result.decision === "ESCALATE" && <AlertTriangle size={20} color="#ca8a04" />}
                  {result.decision === "BLOCK" && <XCircle size={20} color="#dc2626" />}
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: 900,
                      color:
                        result.decision === "ALLOW"
                          ? "#166534"
                          : result.decision === "ESCALATE"
                          ? "#854d0e"
                          : "#991b1b",
                    }}
                  >
                    POLICY DECISION: {result.decision}
                  </span>
                </div>
                <span
                  style={{
                    background: "#ffffff",
                    border: "1px solid #121212",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-pill)",
                    fontSize: "10px",
                    fontWeight: 800,
                  }}
                >
                  LEASH ENGINE
                </span>
              </div>

              <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", lineHeight: "1.4" }}>
                {result.reason}
              </div>

              {/* Checklist breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11px", marginTop: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {result.checks.mandateActive ? "✅" : "❌"} Mandate Active
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {result.checks.budgetAvailable ? "✅" : "❌"} Budget Available
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {result.checks.perPurchaseCap ? "✅" : "❌"} Under Single Cap
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {result.checks.mccAllowed ? "✅" : "❌"} MCC Authorized
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {result.checks.merchantAllowed ? "✅" : "❌"} Merchant Approved
                </div>
              </div>

              {/* Actionable execution buttons to actually update DB */}
              {result.decision === "ALLOW" && (
                <div
                  style={{
                    marginTop: "8px",
                    paddingTop: "12px",
                    borderTop: "1.5px dashed #86efac",
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleExecute("hold")}
                    disabled={executing}
                    style={{
                      padding: "8px 16px",
                      background: "var(--neo-blue)",
                      color: "#121212",
                      border: "1.5px solid #121212",
                      borderRadius: "var(--radius-pill)",
                      fontSize: "12px",
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    {executing ? "Placing PayPal Hold..." : `💳 Real PayPal 2PC Hold ($${amount})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExecute("capture")}
                    disabled={executing}
                    style={{
                      padding: "8px 16px",
                      background: "var(--neo-green)",
                      color: "#121212",
                      border: "1.5px solid #121212",
                      borderRadius: "var(--radius-pill)",
                      fontSize: "12px",
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    {executing ? "Processing Capture..." : `💸 Real PayPal Direct Capture ($${amount})`}
                  </button>
                </div>
              )}

              {result.decision === "ESCALATE" && (
                <div
                  style={{
                    marginTop: "8px",
                    paddingTop: "12px",
                    borderTop: "1.5px dashed #fde047",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleExecute("hold")}
                    disabled={executing}
                    style={{
                      padding: "8px 18px",
                      background: "var(--neo-yellow)",
                      color: "#121212",
                      border: "1.5px solid #121212",
                      borderRadius: "var(--radius-pill)",
                      fontSize: "12px",
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    {executing ? "Sending..." : "⚠️ Send to Human Escalations Inbox (Phase 3)"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
