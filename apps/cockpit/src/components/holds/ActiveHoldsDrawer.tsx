"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Lock,
  ArrowRight,
  CreditCard,
  Building2,
  DollarSign,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import {
  ActiveHoldItem,
  getActiveHolds,
  confirmDeliveryAndCaptureHold,
  releaseVoidHold,
} from "@/lib/actions/holds";

interface ActiveHoldsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mandateIdFilter?: string | undefined;
  onHoldCaptured?: (() => void) | undefined;
}

export function ActiveHoldsDrawer({
  isOpen,
  onClose,
  mandateIdFilter,
  onHoldCaptured,
}: ActiveHoldsDrawerProps) {
  const [holds, setHolds] = useState<ActiveHoldItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [capturingId, setCapturingId] = useState<string | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchHolds = async () => {
    setLoading(true);
    const res = await getActiveHolds(mandateIdFilter);
    if (res.success) {
      setHolds(res.holds);
    } else {
      toast.error(res.error || "Failed to load active holds");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchHolds();
    }
  }, [isOpen, mandateIdFilter]);

  const totalReservedCents = holds.reduce((sum, h) => sum + h.amountCents, 0);
  const totalReservedDollars = (totalReservedCents / 100).toFixed(2);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("PayPal Authorization ID copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCapture = async (hold: ActiveHoldItem) => {
    setCapturingId(hold.paymentRecordId);
    toast.loading(
      `Firing PayPal Sandbox Capture API for $${hold.amountDollars}...`,
      { id: "capture-toast" }
    );

    const res = await confirmDeliveryAndCaptureHold({
      paymentRecordId: hold.paymentRecordId,
      notes: `Confirmed delivery of ${hold.itemName} from ${hold.vendorName}`,
    });

    setCapturingId(null);

    if (res.success) {
      toast.success(
        `💸 Captured $${hold.amountDollars} on PayPal Sandbox! Balance deducted & moved to Captured Spend.`,
        { id: "capture-toast", duration: 5000 }
      );
      // Remove from active list
      setHolds((prev) => prev.filter((h) => h.paymentRecordId !== hold.paymentRecordId));
      if (onHoldCaptured) onHoldCaptured();
    } else {
      toast.error(res.error || "Capture failed", { id: "capture-toast" });
    }
  };

  const handleVoid = async (hold: ActiveHoldItem) => {
    if (
      !confirm(
        `Are you sure you want to void the $${hold.amountDollars} hold? This will release reserved funds in PayPal with $0 fees.`
      )
    ) {
      return;
    }

    setVoidingId(hold.paymentRecordId);
    toast.loading(`Voiding PayPal authorization...`, { id: "void-toast" });

    const res = await releaseVoidHold({
      paymentRecordId: hold.paymentRecordId,
      reason: "Voided by operator via Active Holds Drawer",
    });

    setVoidingId(null);

    if (res.success) {
      toast.success(res.message || "Hold voided successfully!", { id: "void-toast" });
      setHolds((prev) => prev.filter((h) => h.paymentRecordId !== hold.paymentRecordId));
      if (onHoldCaptured) onHoldCaptured();
    } else {
      toast.error(res.error || "Void failed", { id: "void-toast" });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(18, 18, 18, 0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          height: "100%",
          background: "#ffffff",
          borderLeft: "var(--border-thick)",
          boxShadow: "var(--shadow-xl)",
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          overflow: "hidden",
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "var(--border-thick)",
            background: "var(--neo-blue-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "var(--neo-blue)",
                border: "var(--border-thick)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--shadow-sm)",
                color: "#ffffff",
              }}
            >
              <CreditCard size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2
                  style={{
                    fontSize: "18px",
                    fontWeight: 900,
                    color: "#121212",
                    margin: 0,
                    letterSpacing: "-0.01em",
                  }}
                >
                  ACTIVE ESCROW HOLDS
                </h2>
                <span
                  style={{
                    background: "var(--neo-blue)",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: 900,
                    padding: "2px 8px",
                    borderRadius: "var(--radius-pill)",
                    border: "1.5px solid #121212",
                  }}
                >
                  PAYPAL 2PC
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "#1e3a8a", margin: "2px 0 0 0", fontWeight: 600 }}>
                Two-Phase Commit (2PC): Funds reserved with zero fees until delivery confirmation.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={fetchHolds}
              disabled={loading}
              title="Refresh active holds"
              style={{
                background: "#ffffff",
                border: "var(--border-medium)",
                borderRadius: "var(--radius-pill)",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={onClose}
              style={{
                background: "#ffffff",
                border: "var(--border-medium)",
                borderRadius: "var(--radius-pill)",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Live Escrow Balance Summary Strip */}
        <div
          style={{
            padding: "12px 24px",
            background: "#eff6ff",
            borderBottom: "1.5px solid #bfdbfe",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "var(--neo-blue)",
                boxShadow: "0 0 8px rgba(37, 99, 235, 0.6)",
              }}
            />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e40af" }}>
              Total Reserved in PayPal Escrow:
            </span>
          </div>
          <span style={{ fontSize: "16px", fontWeight: 900, color: "#1e3a8a" }}>
            ${totalReservedDollars} USD
          </span>
        </div>

        {/* Content Body */}
        <div

          style={{
            flex: "1 1 0%",
            minHeight: 0,
            overflowY: "auto",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Explanation Callout */}
          <div
            style={{
              background: "#fafaf9",
              border: "1.5px solid #e7e5e4",
              borderRadius: "var(--radius-md)",
              padding: "12px 16px",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={18} color="#0284c7" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div style={{ fontSize: "12px", color: "#44403c", lineHeight: 1.5 }}>
              <strong>How 2PC Capture Works:</strong> When you click{" "}
              <span style={{ color: "#065f46", fontWeight: 800 }}>Confirm Delivery & Capture</span>,
              Agent Leash invokes the real{" "}
              <code>POST /v2/payments/authorizations/{`{id}`}/capture</code> endpoint. The amount is
              instantly deducted from your PayPal Sandbox account and transferred from the Blue
              (Reserved) pool to the Green (Captured Spend) bar!
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: "#64748b" }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 8px auto" }} />
              <p style={{ fontSize: "13px", fontWeight: 600 }}>Loading active PayPal holds...</p>
            </div>
          ) : holds.length === 0 ? (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                background: "#f8faf5",
                borderRadius: "var(--radius-lg)",
                border: "2px dashed #cbd5e1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  background: "var(--neo-green-light)",
                  border: "var(--border-medium)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "12px",
                }}
              >
                <CheckCircle2 size={28} color="#059669" />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 900, color: "#121212", margin: 0 }}>
                No Active Escrow Holds
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  maxWidth: "340px",
                  margin: "6px 0 0 0",
                  lineHeight: 1.4,
                }}
              >
                All authorized agent transactions have either been captured upon delivery or voided
                with zero fees.
              </p>
            </div>
          ) : (
            holds.map((hold) => (
              <div
                key={hold.paymentRecordId}
                style={{
                  background: "#ffffff",
                  border: "var(--border-thick)",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "var(--shadow-base)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  flexShrink: 0,
                  transition: "transform 0.15s ease",
                }}
              >
                {/* Hold Card Top Banner */}
                <div
                  style={{
                    padding: "14px 18px",
                    background: "var(--neo-cream)",
                    borderBottom: "var(--border-thick)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 900,
                          color: "#1e3a8a",
                          background: "#ffffff",
                          border: "1.5px solid #121212",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-pill)",
                          textTransform: "uppercase",
                          letterSpacing: "0.02em",
                          boxShadow: "1px 1px 0px #121212",
                        }}
                      >
                        {hold.agentName}
                      </span>
                    </div>
                    <h4
                      style={{
                        fontSize: "16px",
                        fontWeight: 900,
                        color: "#121212",
                        margin: "4px 0 0 0",
                      }}
                    >
                      {hold.vendorName}
                    </h4>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "22px",
                        fontWeight: 900,
                        color: "#0f172a",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      ${hold.amountDollars}
                    </div>
                    <span
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 900,
                        color: "#0369a1",
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                      }}
                    >
                      29-Day Hold Active
                    </span>
                  </div>
                </div>

                {/* Hold Details Body */}
                <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px", background: "#ffffff" }}>
                  {/* Item Description */}
                  <div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 900,
                        color: "#334155",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        background: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        display: "inline-block",
                        marginBottom: "4px",
                      }}
                    >
                      ITEM & COMPUTE WORKLOAD
                    </span>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", margin: "2px 0 0 0", lineHeight: 1.4 }}>
                      {hold.itemName}
                    </p>
                    {hold.justification && (
                      <p style={{ fontSize: "12px", color: "#475569", margin: "3px 0 0 0", fontStyle: "italic", lineHeight: 1.4 }}>
                        &ldquo;{hold.justification}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* PayPal Identifiers Strip */}
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1.5px solid #cbd5e1",
                      borderRadius: "var(--radius-sm)",
                      padding: "10px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
                      <span style={{ color: "#475569", fontWeight: 700 }}>PayPal Auth ID:</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <code style={{ fontWeight: 800, color: "#0f172a", fontFamily: "var(--font-mono)", background: "#ffffff", padding: "1px 6px", borderRadius: "4px", border: "1px solid #cbd5e1" }}>
                          {hold.paypalAuthorizationId.slice(0, 16)}...
                        </code>
                        <button
                          onClick={() => copyToClipboard(hold.paypalAuthorizationId, hold.paymentRecordId)}
                          style={{
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                            cursor: "pointer",
                            padding: "2px 4px",
                            display: "flex",
                            alignItems: "center",
                          }}
                          title="Copy Authorization ID"
                        >
                          {copiedId === hold.paymentRecordId ? (
                            <Check size={12} color="#059669" />
                          ) : (
                            <Copy size={12} color="#334155" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
                      <span style={{ color: "#475569", fontWeight: 700 }}>PayPal Order ID:</span>
                      <code style={{ fontWeight: 700, color: "#0f172a", fontFamily: "var(--font-mono)" }}>
                        {hold.paypalOrderId}
                      </code>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
                      <span style={{ color: "#475569", fontWeight: 700 }}>Authorized At:</span>
                      <span style={{ color: "#0f172a", fontWeight: 700 }}>
                        {hold.authorizedAt ? new Date(hold.authorizedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                      </span>
                    </div>
                  </div>

                  {/* Flow preview: Reserved -> Captured */}
                  <div
                    style={{
                      background: "#f0fdf4",
                      border: "1.5px solid #86efac",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "11px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          background: "#0284c7",
                          color: "#ffffff",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontWeight: 800,
                        }}
                      >
                        Reserved (${hold.amountDollars})
                      </span>
                      <ArrowRight size={13} color="#059669" strokeWidth={2.5} />
                      <span
                        style={{
                          background: "var(--neo-green)",
                          color: "#121212",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontWeight: 800,
                        }}
                      >
                        Captured Spend (${hold.amountDollars})
                      </span>
                    </div>
                    <span style={{ color: "#166534", fontWeight: 800 }}>Shift on Capture</span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div
                  style={{
                    padding: "12px 18px",
                    background: "#f8fafc",
                    borderTop: "var(--border-thick)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <button
                    onClick={() => handleVoid(hold)}
                    disabled={voidingId === hold.paymentRecordId || capturingId === hold.paymentRecordId}
                    style={{
                      padding: "8px 14px",
                      background: "#ffffff",
                      border: "1.5px solid #cbd5e1",
                      borderRadius: "var(--radius-pill)",
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#dc2626",
                      cursor: "pointer",
                      transition: "all 0.1s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fee2e2")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                  >
                    {voidingId === hold.paymentRecordId ? "Voiding..." : "❌ Void Hold (Free)"}
                  </button>

                  <button
                    onClick={() => handleCapture(hold)}
                    disabled={capturingId === hold.paymentRecordId || voidingId === hold.paymentRecordId}
                    style={{
                      flex: 1,
                      padding: "10px 18px",
                      background: "var(--neo-green)",
                      border: "var(--border-thick)",
                      borderRadius: "var(--radius-pill)",
                      fontSize: "13px",
                      fontWeight: 900,
                      color: "#121212",
                      cursor: "pointer",
                      boxShadow: "var(--shadow-sm)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 0.1s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translate(-1px, -1px)";
                      e.currentTarget.style.boxShadow = "var(--shadow-base)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                    }}
                  >
                    {capturingId === hold.paymentRecordId ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Capturing on PayPal...</span>
                      </>
                    ) : (
                      <>
                        <span>💸 Confirm Delivery & Capture (${hold.amountDollars})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "var(--border-thick)",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748b" }}>
            <Lock size={13} color="#059669" />
            <span>Cryptographic Ledger Synced</span>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "7px 16px",
              background: "#121212",
              color: "#ffffff",
              border: "none",
              borderRadius: "var(--radius-pill)",
              fontSize: "12px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  );
}
