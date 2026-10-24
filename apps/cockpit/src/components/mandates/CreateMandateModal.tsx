"use client";

import { useState } from "react";
import {
  X,
  ShieldCheck,
  Plus,
  Trash2,
  DollarSign,
  Tag,
  Store,
  Clock,
  Sparkles,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import { createMandate, MandateWithAgent } from "@/lib/actions/mandates";

interface CreateMandateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (mandate: MandateWithAgent) => void;
}

export function CreateMandateModal({
  isOpen,
  onClose,
  onCreated,
}: CreateMandateModalProps) {
  const [agentName, setAgentName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [totalBudget, setTotalBudget] = useState("250.00");
  const [perPurchaseCap, setPerPurchaseCap] = useState("50.00");
  const [escalateAbove, setEscalateAbove] = useState("100.00");
  const [categories, setCategories] = useState<string[]>(["7372", "5734"]);
  const [merchants, setMerchants] = useState<string[]>([
    "AWS Cloud Services",
    "GitHub",
    "DigitalOcean",
  ]);
  const [newMerchant, setNewMerchant] = useState("");
  const [deliverySlaHours, setDeliverySlaHours] = useState(72);
  const [captureMode, setCaptureMode] = useState<"on_delivery" | "immediate">("on_delivery");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddMerchant = () => {
    if (!newMerchant.trim()) return;
    if (merchants.includes(newMerchant.trim())) return;
    setMerchants([...merchants, newMerchant.trim()]);
    setNewMerchant("");
  };

  const handleRemoveMerchant = (m: string) => {
    setMerchants(merchants.filter((item) => item !== m));
  };

  const toggleCategory = (mcc: string) => {
    if (categories.includes(mcc)) {
      setCategories(categories.filter((c) => c !== mcc));
    } else {
      setCategories([...categories, mcc]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const budgetCents = Math.round(parseFloat(totalBudget) * 100);
    const capCents = Math.round(parseFloat(perPurchaseCap) * 100);
    const escalateCents = Math.round(parseFloat(escalateAbove) * 100);

    if (isNaN(budgetCents) || budgetCents <= 0) {
      toast.error("Please enter a valid total budget");
      return;
    }
    if (isNaN(capCents) || capCents <= 0) {
      toast.error("Please enter a valid per-purchase cap");
      return;
    }

    setSubmitting(true);
    const res = await createMandate({
      agentName,
      purpose,
      totalBudgetCents: budgetCents,
      perPurchaseCapCents: capCents,
      escalateAboveCents: escalateCents,
      allowedCategories: categories,
      merchantAllowlist: merchants,
      deliverySlaHours,
      captureMode,
    });
    setSubmitting(false);

    if (res.success && res.mandate) {
      toast.success("Mandate created and cryptographically signed!");
      onCreated(res.mandate);
      onClose();
    } else {
      toast.error(res.error ?? "Failed to create mandate");
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
          maxWidth: "680px",
          maxHeight: "90vh",
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
            padding: "20px 24px",
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
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "#121212",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldCheck size={20} color="#facc15" />
            </div>
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: 900, color: "#121212", margin: 0 }}>
                NEW AGENT SPENDING MANDATE
              </h3>
              <span style={{ fontSize: "11px", color: "#4b5563", fontWeight: 700 }}>
                Cryptographically bound spending rulebook
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

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            overflowY: "auto",
          }}
        >
          {/* Agent Name */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", marginBottom: "4px" }}>
              TARGET AGENT NAME
            </label>
            <input
              type="text"
              placeholder="e.g., DevOps Autonomous Scaling Worker"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                border: "var(--border-medium)",
                fontSize: "14px",
                fontWeight: 600,
                outline: "none",
              }}
            />
          </div>

          {/* Purpose Statement */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", marginBottom: "4px" }}>
              CANONICAL PURPOSE STATEMENT
            </label>
            <textarea
              rows={2}
              placeholder="e.g., Cloud compute autoscaling, GPU cluster reservations, and software package dependencies."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                border: "var(--border-medium)",
                fontSize: "13px",
                fontWeight: 500,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Budget Limits Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", marginBottom: "4px" }}>
                TOTAL BUDGET ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "var(--border-medium)",
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", marginBottom: "4px" }}>
                SINGLE-PURCHASE CAP ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={perPurchaseCap}
                onChange={(e) => setPerPurchaseCap(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "var(--border-medium)",
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", marginBottom: "4px" }}>
                ESCALATE ABOVE ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={escalateAbove}
                onChange={(e) => setEscalateAbove(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "var(--border-medium)",
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              />
            </div>
          </div>

          {/* Allowed MCC Categories */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", marginBottom: "6px" }}>
              ALLOWED MCC CATEGORIES (CLICK TO TOGGLE)
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {[
                { code: "7372", label: "Cloud Services & Software (7372)" },
                { code: "5734", label: "Software & SaaS Stores (5734)" },
                { code: "4816", label: "Network & Domain Registrars (4816)" },
                { code: "5045", label: "Computers & Electronics (5045)" },
              ].map((c) => {
                const active = categories.includes(c.code);
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => toggleCategory(c.code)}
                    style={{
                      padding: "6px 12px",
                      background: active ? "var(--neo-green)" : "#ffffff",
                      border: "1.5px solid #121212",
                      borderRadius: "var(--radius-pill)",
                      fontSize: "11px",
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: active ? "var(--shadow-sm)" : "none",
                    }}
                  >
                    {active ? "✓ " : "+ "} {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Merchant Allowlist */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", marginBottom: "4px" }}>
              MERCHANT ALLOWLIST
            </label>
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <input
                type="text"
                placeholder="Add approved vendor (e.g., RunPod, OpenAI, AWS)"
                value={newMerchant}
                onChange={(e) => setNewMerchant(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddMerchant();
                  }
                }}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "var(--border-medium)",
                  fontSize: "13px",
                }}
              />
              <button
                type="button"
                onClick={handleAddMerchant}
                style={{
                  padding: "8px 16px",
                  background: "#121212",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  fontWeight: 800,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Add
              </button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {merchants.map((m) => (
                <span
                  key={m}
                  style={{
                    background: "var(--neo-cream)",
                    border: "1.5px solid #121212",
                    borderRadius: "var(--radius-pill)",
                    padding: "3px 10px",
                    fontSize: "11px",
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {m}
                  <button
                    type="button"
                    onClick={() => handleRemoveMerchant(m)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "#991b1b" }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Escrow & Delivery SLA */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", marginBottom: "4px" }}>
                CAPTURE MODE
              </label>
              <select
                value={captureMode}
                onChange={(e) => setCaptureMode(e.target.value as any)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "var(--border-medium)",
                  fontSize: "13px",
                  fontWeight: 700,
                  background: "#ffffff",
                }}
              >
                <option value="on_delivery">2PC Escrow (Hold then Capture on delivery)</option>
                <option value="immediate">Immediate Capture</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", marginBottom: "4px" }}>
                DELIVERY SLA (HOURS)
              </label>
              <input
                type="number"
                value={deliverySlaHours}
                onChange={(e) => setDeliverySlaHours(parseInt(e.target.value) || 72)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "var(--border-medium)",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 18px",
                background: "#e2e8f0",
                border: "1.5px solid #121212",
                borderRadius: "var(--radius-pill)",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "10px 24px",
                background: "var(--neo-green)",
                border: "var(--border-medium)",
                borderRadius: "var(--radius-pill)",
                boxShadow: "var(--shadow-sm)",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Lock size={14} /> {submitting ? "Signing & Creating..." : "Sign & Create Mandate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
