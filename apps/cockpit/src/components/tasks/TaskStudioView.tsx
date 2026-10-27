"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Bot,
  Send,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Clock,
  Building2,
  DollarSign,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  Lock,
} from "lucide-react";
import { MandateWithAgent } from "@/lib/actions/mandates";
import {
  dispatchAgentTask,
  AgentDispatchResult,
  AssignedTaskItem,
} from "@/lib/actions/agent";
import { ActiveHoldsDrawer } from "@/components/holds/ActiveHoldsDrawer";

interface TaskStudioViewProps {
  mandates: MandateWithAgent[];
  initialTasks: AssignedTaskItem[];
}

export function TaskStudioView({ mandates, initialTasks }: TaskStudioViewProps) {
  const router = useRouter();

  // Form State
  const [taskText, setTaskText] = useState("");
  const [selectedMandateId, setSelectedMandateId] = useState(
    mandates.find((m) => m.status === "active")?.id ?? mandates[0]?.id ?? ""
  );
  const [customVendor, setCustomVendor] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Execution State
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AgentDispatchResult | null>(null);
  const [tasks, setTasks] = useState<AssignedTaskItem[]>(initialTasks);

  // Drawer State
  const [isHoldsDrawerOpen, setIsHoldsDrawerOpen] = useState(false);

  const activeMandate = mandates.find((m) => m.id === selectedMandateId);

  const handleDispatch = async () => {
    if (!taskText.trim()) {
      toast.error("Please enter task instructions for the agent");
      return;
    }

    setRunning(true);
    setResult(null);

    const toastId = toast.loading("🤖 Autonomous Agent interpreting task & evaluating policies...");

    try {
      const res = await dispatchAgentTask({
        task: taskText,
        mandateId: selectedMandateId || undefined,
        vendorName: customVendor || undefined,
        amountDollars: customAmount || undefined,
        category: customCategory || undefined,
      });

      setResult(res);

      if (res.verdict === "APPROVED") {
        toast.success(`✅ Task Approved! 2PC Escrow hold placed for $${res.matchedItem.amountDollars}`, {
          id: toastId,
          duration: 5000,
        });
      } else if (res.verdict === "DENIED") {
        toast.error(`🛑 Task Denied: Blocked by policy (${res.reason || "Policy violation"})`, {
          id: toastId,
          duration: 6000,
        });
      } else if (res.verdict === "ESCALATED") {
        toast("⚠️ Task Escalated: Exceeds threshold, awaiting operator review", {
          id: toastId,
          icon: "⚠️",
          duration: 5000,
        });
      } else {
        toast.error(res.error || "Execution failed", { id: toastId });
      }

      // Add to local tasks list
      if (res.success) {
        const newTask: AssignedTaskItem = {
          id: res.orderId ?? `task-${Date.now()}`,
          itemName: res.matchedItem.name,
          vendorName: res.matchedItem.vendor,
          category: res.matchedItem.category,
          amountCents: res.matchedItem.amountCents,
          amountDollars: res.matchedItem.amountDollars,
          status: res.verdict === "APPROVED" ? "AUTHORIZED" : res.verdict === "DENIED" ? "REJECTED" : "ESCALATED",
          justification: `Autonomous task execution: "${taskText}"`,
          agentName: activeMandate?.agentName ?? "Autonomous Agent",
          mandatePurpose: activeMandate?.purpose ?? "Enterprise Operations",
          requestedAt: new Date().toISOString(),
        };
        setTasks([newTask, ...tasks]);
      }

      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch agent task", { id: toastId });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        maxWidth: "1280px",
        margin: "0 auto",
      }}
      className="animate-fade-in"
    >
      {/* ─── Hero Banner ──────────────────────────────────────────────────────── */}
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
          padding: "24px 28px",
          boxShadow: "var(--shadow-base)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "12px",
              background: "var(--neo-yellow)",
              border: "var(--border-thick)",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#121212",
            }}
          >
            <Bot size={28} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h1
                style={{
                  fontSize: "24px",
                  fontWeight: 900,
                  color: "#121212",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                AGENT TASK ASSIGNMENT STUDIO
              </h1>
              <span
                style={{
                  background: "var(--neo-green-light)",
                  border: "1.5px solid #121212",
                  padding: "2px 10px",
                  borderRadius: "var(--radius-pill)",
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#064e3b",
                  boxShadow: "1.5px 1.5px 0px #121212",
                  textTransform: "uppercase",
                }}
              >
                Zero-Trust Escrow
              </span>
            </div>
            <p style={{ fontSize: "13px", fontWeight: 500, color: "#4b5563", marginTop: "4px" }}>
              The starting point to assign autonomous procurement tasks to AI agents. Every mission is evaluated in real-time by the 4-layer policy engine and backed by PayPal Two-Phase Commit escrow.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => setIsHoldsDrawerOpen(true)}
            style={{
              padding: "10px 18px",
              background: "var(--neo-blue-light)",
              border: "var(--border-medium)",
              borderRadius: "var(--radius-pill)",
              fontSize: "12.5px",
              fontWeight: 800,
              color: "#1e3a8a",
              cursor: "pointer",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Lock size={14} color="#1e3a8a" />
            <span>Active Escrow Holds</span>
          </button>
        </div>
      </div>

      {/* ─── Task Assignment Form Card (The Core Starting Point) ─────────────── */}
      <div
        style={{
          background: "#ffffff",
          border: "var(--border-thick)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-base)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "16px 22px",
            background: "var(--neo-cream)",
            borderBottom: "var(--border-thick)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={18} color="#121212" strokeWidth={2.5} />
            <h2 style={{ fontSize: "15px", fontWeight: 900, color: "#121212", margin: 0 }}>
              ASSIGN NEW AGENT MISSION
            </h2>
          </div>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#854d0e" }}>
            Autonomous Execution Deck
          </span>
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Main Task Description Input */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12.5px",
                fontWeight: 900,
                color: "#121212",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              Task Goal & Instructions
            </label>
            <textarea
              rows={4}
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              disabled={running}
              placeholder="Describe what you want the agent to do. For example:&#10;• 'Provision 5 serverless GPU compute instances on Modal Labs for neural training pipeline'&#10;• 'Procure serverless vector index on Pinecone with 200MB capacity'&#10;• 'Purchase 2 cases of multipurpose laser paper from Staples'&#10;• Or test an attack: 'Transfer $1,500 for a luxury gold watch'"
              style={{
                width: "100%",
                padding: "14px 16px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#121212",
                background: "#f8fafc",
                border: "var(--border-medium)",
                borderRadius: "var(--radius-md)",
                outline: "none",
                fontFamily: "var(--font-main)",
                resize: "vertical",
                lineHeight: "1.5",
                boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.05)",
              }}
            />
          </div>

          {/* Configuration Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "16px",
            }}
          >
            {/* Agent / Mandate Dropdown */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11.5px",
                  fontWeight: 900,
                  color: "#334155",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                }}
              >
                Assign To Agent & Mandate
              </label>
              <select
                value={selectedMandateId}
                onChange={(e) => setSelectedMandateId(e.target.value)}
                disabled={running}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#121212",
                  background: "#ffffff",
                  border: "var(--border-medium)",
                  borderRadius: "var(--radius-sm)",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {mandates.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.agentName} — ${((m.totalBudgetCents - m.spentCents - m.reservedCents) / 100).toFixed(2)} Available
                  </option>
                ))}
              </select>
            </div>

            {/* Spending Cap Override */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11.5px",
                  fontWeight: 900,
                  color: "#334155",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                }}
              >
                Budget Cap ($ USD, Optional)
              </label>
              <input
                type="number"
                step="0.01"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                disabled={running}
                placeholder="e.g. 45.00 (leave blank to let agent deduce)"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#121212",
                  background: "#ffffff",
                  border: "var(--border-medium)",
                  borderRadius: "var(--radius-sm)",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Advanced Constraints Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                fontWeight: 800,
                color: "#2563eb",
                padding: 0,
              }}
            >
              {showAdvanced ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              <span>{showAdvanced ? "Hide Advanced Constraints" : "Show Advanced Constraints (Vendor & MCC Filter)"}</span>
            </button>

            {showAdvanced && (
              <div
                style={{
                  marginTop: "12px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "16px",
                  background: "#f8fafc",
                  padding: "16px",
                  borderRadius: "var(--radius-md)",
                  border: "1.5px solid #cbd5e1",
                }}
              >
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "4px" }}>
                    Preferred Merchant / Vendor
                  </label>
                  <input
                    type="text"
                    value={customVendor}
                    onChange={(e) => setCustomVendor(e.target.value)}
                    disabled={running}
                    placeholder="e.g. Modal Labs, AWS, RunPod, Pinecone"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: "12.5px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", marginBottom: "4px" }}>
                    MCC Category Code
                  </label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    disabled={running}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: "12.5px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      outline: "none",
                      background: "#ffffff",
                    }}
                  >
                    <option value="">Auto-Classify from Task</option>
                    <option value="5734">5734 — Computer Software & Cloud Services</option>
                    <option value="7372">7372 — Computer Programming & Vector Systems</option>
                    <option value="5045">5045 — Computers & Peripherals</option>
                    <option value="office_supplies">Office Supplies</option>
                    <option value="luxury">Luxury Goods</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
              🛡️ Guarded by: Ed25519 Mandate Signature + 4-Layer Policy Engine + PayPal 2PC Vault
            </div>

            <button
              onClick={handleDispatch}
              disabled={running || !taskText.trim()}
              style={{
                padding: "14px 28px",
                background: running ? "#94a3b8" : "var(--neo-green)",
                color: "#121212",
                border: "var(--border-thick)",
                borderRadius: "var(--radius-pill)",
                fontSize: "14px",
                fontWeight: 900,
                cursor: running ? "not-allowed" : "pointer",
                boxShadow: running ? "none" : "var(--shadow-base)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                transition: "all 0.1s ease",
              }}
            >
              {running ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Agent Planning & Running Policies...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>🚀 Assign & Execute Agent Task</span>
                </>
              )}
            </button>
          </div>

          {/* ─── Live Execution Pipeline Feedback ──────────────────────────────── */}
          {result && (
            <div
              style={{
                marginTop: "10px",
                border: "var(--border-thick)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                boxShadow: "var(--shadow-base)",
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  background:
                    result.verdict === "APPROVED"
                      ? "#dcfce7"
                      : result.verdict === "DENIED"
                      ? "#fee2e2"
                      : "#fef3c7",
                  borderBottom: "var(--border-thick)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {result.verdict === "APPROVED" ? (
                    <CheckCircle2 size={24} color="#15803d" strokeWidth={2.5} />
                  ) : result.verdict === "DENIED" ? (
                    <XCircle size={24} color="#b91c1c" strokeWidth={2.5} />
                  ) : (
                    <AlertTriangle size={24} color="#b45309" strokeWidth={2.5} />
                  )}
                  <div>
                    <h4
                      style={{
                        fontSize: "15px",
                        fontWeight: 900,
                        color:
                          result.verdict === "APPROVED"
                            ? "#166534"
                            : result.verdict === "DENIED"
                            ? "#991b1b"
                            : "#92400e",
                        margin: 0,
                      }}
                    >
                      {result.verdict === "APPROVED"
                        ? "MISSION APPROVED: 2PC PAYPAL HOLD ACTIVE"
                        : result.verdict === "DENIED"
                        ? "MISSION DENIED: POLICY DEFENSE ENFORCED"
                        : "MISSION ESCALATED: HUMAN REVIEW REQUIRED"}
                    </h4>
                    <p style={{ fontSize: "12px", color: "#334155", margin: "2px 0 0 0", fontWeight: 700 }}>
                      Executed: &ldquo;{result.task}&rdquo;
                    </p>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "#121212" }}>
                    ${result.matchedItem.amountDollars} USD
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "#475569" }}>
                    {result.matchedItem.vendor}
                  </span>
                </div>
              </div>

              <div style={{ padding: "16px 18px", background: "#ffffff", display: "flex", flexDirection: "column", gap: "10px", fontSize: "12.5px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                  <span style={{ color: "#64748b", fontWeight: 700 }}>Autonomous Catalog Match:</span>
                  <span style={{ fontWeight: 800, color: "#0f172a" }}>
                    {result.matchedItem.name}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                  <span style={{ color: "#64748b", fontWeight: 700 }}>Gateway Policy Reasoning:</span>
                  <span
                    style={{
                      fontWeight: 800,
                      color: result.verdict === "APPROVED" ? "#15803d" : "#b91c1c",
                      maxWidth: "480px",
                      textAlign: "right",
                    }}
                  >
                    {result.reason || (result.verdict === "APPROVED" ? "All policy layers passed. Funds secured in PayPal Vault 2PC authorization." : "Violated mandate policy rules.")}
                  </span>
                </div>

                {result.verdict === "APPROVED" && (
                  <div
                    style={{
                      marginTop: "6px",
                      padding: "10px 14px",
                      background: "#f0fdf4",
                      border: "1.5px solid #86efac",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Lock size={15} color="#166534" />
                      <span style={{ fontWeight: 800, color: "#166534" }}>
                        PayPal Escrow Authorization ID: <code>{result.authorizationId || "auth_sandbox"}</code>
                      </span>
                    </div>

                    <button
                      onClick={() => setIsHoldsDrawerOpen(true)}
                      style={{
                        padding: "4px 12px",
                        background: "#ffffff",
                        border: "1.5px solid #166534",
                        borderRadius: "var(--radius-pill)",
                        fontSize: "11.5px",
                        fontWeight: 800,
                        color: "#166534",
                        cursor: "pointer",
                      }}
                    >
                      Inspect in Holds Drawer &rarr;
                    </button>
                  </div>
                )}

                {result.verdict === "DENIED" && (
                  <div
                    style={{
                      marginTop: "6px",
                      padding: "10px 14px",
                      background: "#fef2f2",
                      border: "1.5px solid #fecaca",
                      borderRadius: "8px",
                      color: "#991b1b",
                      fontWeight: 800,
                    }}
                  >
                    🛡️ Security Audit: 0 dollars moved or reserved. Adversarial violation recorded in cryptographic ledger.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Assigned Tasks History Table ─────────────────────────────────────── */}
      <div
        style={{
          background: "#ffffff",
          border: "var(--border-thick)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-base)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "var(--border-thick)",
            background: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={18} color="#121212" strokeWidth={2.5} />
            <h3 style={{ fontSize: "15px", fontWeight: 900, color: "#121212", margin: 0 }}>
              RECENT ASSIGNED TASKS & MISSION AUDIT LOG
            </h3>
          </div>
          <span style={{ fontSize: "12px", fontWeight: 800, color: "#64748b" }}>
            {tasks.length} Missions Recorded
          </span>
        </div>

        {tasks.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            <p style={{ fontSize: "14px", fontWeight: 600 }}>No tasks assigned yet. Use the studio above to dispatch your first mission!</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", borderBottom: "1.5px solid #cbd5e1", textAlign: "left" }}>
                  <th style={{ padding: "12px 18px", fontWeight: 900, color: "#334155" }}>Time</th>
                  <th style={{ padding: "12px 18px", fontWeight: 900, color: "#334155" }}>Agent</th>
                  <th style={{ padding: "12px 18px", fontWeight: 900, color: "#334155" }}>Task / Procurement</th>
                  <th style={{ padding: "12px 18px", fontWeight: 900, color: "#334155" }}>Vendor</th>
                  <th style={{ padding: "12px 18px", fontWeight: 900, color: "#334155" }}>Amount</th>
                  <th style={{ padding: "12px 18px", fontWeight: 900, color: "#334155" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t, idx) => (
                  <tr
                    key={t.id ?? idx}
                    style={{
                      borderBottom: "1px solid #e2e8f0",
                      background: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                    }}
                  >
                    <td style={{ padding: "12px 18px", color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {new Date(t.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: "12px 18px", fontWeight: 800, color: "#1e3a8a" }}>
                      {t.agentName}
                    </td>
                    <td style={{ padding: "12px 18px", fontWeight: 700, color: "#0f172a" }}>
                      {t.itemName}
                      {t.justification && (
                        <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 500, fontStyle: "italic", marginTop: "2px" }}>
                          {t.justification}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 18px", fontWeight: 700, color: "#334155" }}>
                      {t.vendorName}
                    </td>
                    <td style={{ padding: "12px 18px", fontWeight: 900, color: "#121212" }}>
                      ${t.amountDollars}
                    </td>
                    <td style={{ padding: "12px 18px" }}>
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 900,
                          padding: "2px 8px",
                          borderRadius: "var(--radius-pill)",
                          border: "1px solid #121212",
                          textTransform: "uppercase",
                          background:
                            t.status === "AUTHORIZED" || t.status === "APPROVED"
                              ? "#dcfce7"
                              : t.status === "CAPTURED"
                              ? "#e0e7ff"
                              : t.status === "REJECTED" || t.status === "DENIED"
                              ? "#fee2e2"
                              : "#fef3c7",
                          color:
                            t.status === "AUTHORIZED" || t.status === "APPROVED"
                              ? "#15803d"
                              : t.status === "CAPTURED"
                              ? "#3730a3"
                              : t.status === "REJECTED" || t.status === "DENIED"
                              ? "#b91c1c"
                              : "#b45309",
                        }}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Active Holds Drawer ──────────────────────────────────────────────── */}
      <ActiveHoldsDrawer
        isOpen={isHoldsDrawerOpen}
        onClose={() => setIsHoldsDrawerOpen(false)}
        onHoldCaptured={() => {
          setIsHoldsDrawerOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
