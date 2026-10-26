"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  X,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Clock,
  Layers,
} from "lucide-react";
import {
  NotificationItem,
  NotificationSummary,
  getNotifications,
} from "@/lib/actions/notifications";
import { confirmDeliveryAndCaptureHold } from "@/lib/actions/holds";

interface NotificationBellProps {
  onOpenHoldsDrawer: () => void;
}

export function NotificationBell({ onOpenHoldsDrawer }: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState<NotificationSummary>({
    unreadCount: 0,
    activeHoldsCount: 0,
    pendingEscalationsCount: 0,
    notifications: [],
  });
  const [loading, setLoading] = useState(false);
  const [capturingId, setCapturingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "action" | "holds">("action");
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    const res = await getNotifications();
    if (res.success) {
      setSummary(res.summary);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();

    // Auto-poll every 30 seconds for live notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleCaptureDirect = async (notif: NotificationItem) => {
    if (!notif.paymentRecordId) return;

    setCapturingId(notif.paymentRecordId);
    toast.loading(`Capturing $${notif.amountDollars} on PayPal Sandbox...`, { id: "notif-cap" });

    const res = await confirmDeliveryAndCaptureHold({
      paymentRecordId: notif.paymentRecordId,
      notes: "Captured directly from TopBar Notifications",
    });

    setCapturingId(null);

    if (res.success) {
      toast.success(
        `💸 Captured $${notif.amountDollars}! Deducted from PayPal Sandbox balance.`,
        { id: "notif-cap", duration: 5000 }
      );
      fetchNotifications();
      router.refresh();
    } else {
      toast.error(res.error || "Capture failed", { id: "notif-cap" });
    }
  };

  const filteredNotifications = summary.notifications.filter((n) => {
    if (activeTab === "action") return n.type === "hold" || n.type === "escalation";
    if (activeTab === "holds") return n.type === "hold";
    return true;
  });

  return (
    <div style={{ position: "relative" }} ref={popoverRef}>
      {/* The Bell Button */}
      <button
        id="notification-bell"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        aria-label="View notifications"
        style={{
          position: "relative",
          display: "flex",
          height: "40px",
          width: "40px",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "var(--radius-pill)",
          background: isOpen ? "var(--neo-yellow)" : "#ffffff",
          border: "var(--border-medium)",
          boxShadow: "var(--shadow-sm)",
          cursor: "pointer",
          transition: "transform 0.1s ease, background 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "translate(-1px, -1px)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
      >
        <Bell size={18} color="#121212" strokeWidth={2.4} />

        {/* Live Badge Pill with Count */}
        {summary.unreadCount > 0 ? (
          <span
            style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              minWidth: "18px",
              height: "18px",
              padding: "0 4px",
              borderRadius: "var(--radius-pill)",
              background: "var(--neo-orange)",
              color: "#ffffff",
              border: "1.5px solid #121212",
              fontSize: "10px",
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "1px 1px 0px #121212",
              animation: "pulse 2s infinite ease-in-out",
            }}
          >
            {summary.unreadCount}
          </span>
        ) : (
          <span
            style={{
              position: "absolute",
              right: "3px",
              top: "3px",
              height: "8px",
              width: "8px",
              borderRadius: "50%",
              background: "var(--neo-green)",
              border: "1.5px solid #121212",
            }}
          />
        )}
      </button>

      {/* The Notifications Popover Dropdown */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "52px",
            right: 0,
            width: "400px",
            maxHeight: "520px",
            background: "#ffffff",
            border: "var(--border-thick)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-xl)",
            display: "flex",
            flexDirection: "column",
            zIndex: 9999,
            overflow: "hidden",
            animation: "fadeIn 0.15s ease",
          }}
        >
          {/* Popover Header */}
          <div
            style={{
              padding: "16px 18px",
              background: "var(--neo-yellow)",
              borderBottom: "var(--border-thick)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Bell size={18} color="#121212" strokeWidth={2.5} />
              <h3 style={{ fontSize: "14px", fontWeight: 900, margin: 0, color: "#121212" }}>
                ACTION CENTER & ALERTS
              </h3>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                onClick={fetchNotifications}
                title="Refresh"
                style={{
                  background: "#ffffff",
                  border: "1px solid #121212",
                  borderRadius: "50%",
                  width: "24px",
                  height: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #121212",
                  borderRadius: "50%",
                  width: "24px",
                  height: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div
            style={{
              display: "flex",
              borderBottom: "1.5px solid #e2e8f0",
              background: "#f8faf5",
              padding: "6px 12px",
              gap: "6px",
            }}
          >
            <button
              onClick={() => setActiveTab("action")}
              style={{
                flex: 1,
                padding: "6px 8px",
                borderRadius: "var(--radius-pill)",
                border: activeTab === "action" ? "1.5px solid #121212" : "1.5px solid transparent",
                background: activeTab === "action" ? "var(--neo-orange)" : "transparent",
                color: activeTab === "action" ? "#ffffff" : "#4b5563",
                fontSize: "11px",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              Action Required ({summary.unreadCount})
            </button>
            <button
              onClick={() => setActiveTab("holds")}
              style={{
                flex: 1,
                padding: "6px 8px",
                borderRadius: "var(--radius-pill)",
                border: activeTab === "holds" ? "1.5px solid #121212" : "1.5px solid transparent",
                background: activeTab === "holds" ? "var(--neo-blue)" : "transparent",
                color: activeTab === "holds" ? "#ffffff" : "#4b5563",
                fontSize: "11px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              2PC Holds ({summary.activeHoldsCount})
            </button>
            <button
              onClick={() => setActiveTab("all")}
              style={{
                flex: 1,
                padding: "6px 8px",
                borderRadius: "var(--radius-pill)",
                border: activeTab === "all" ? "1.5px solid #121212" : "1.5px solid transparent",
                background: activeTab === "all" ? "#121212" : "transparent",
                color: activeTab === "all" ? "#ffffff" : "#4b5563",
                fontSize: "11px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              All Activity
            </button>
          </div>

          {/* List of Notification Items */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {filteredNotifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "#64748b" }}>
                <CheckCircle2 size={28} color="#059669" style={{ margin: "0 auto 8px auto" }} />
                <p style={{ fontSize: "13px", fontWeight: 800, color: "#121212", margin: 0 }}>
                  All clear!
                </p>
                <p style={{ fontSize: "11px", margin: "2px 0 0 0" }}>
                  No pending holds or escalation SLA tasks right now.
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    background:
                      n.type === "hold"
                        ? "#f0f9ff"
                        : n.type === "escalation"
                        ? "#fefce8"
                        : "#f8faf5",
                    border:
                      n.type === "hold"
                        ? "1.5px solid #93c5fd"
                        : n.type === "escalation"
                        ? "1.5px solid #fde047"
                        : "1px solid #e2e8f0",
                    borderRadius: "var(--radius-md)",
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                    <div>
                      <h4 style={{ fontSize: "12.5px", fontWeight: 900, margin: 0, color: "#121212" }}>
                        {n.title}
                      </h4>
                      <p style={{ fontSize: "11.5px", color: "#475569", margin: "2px 0 0 0", lineHeight: 1.35 }}>
                        {n.description}
                      </p>
                    </div>

                    {n.amountDollars && (
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 900,
                          color: n.type === "hold" ? "#0284c7" : "#854d0e",
                          flexShrink: 0,
                        }}
                      >
                        ${n.amountDollars}
                      </span>
                    )}
                  </div>

                  {/* Actions for this item */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: "4px",
                      paddingTop: "6px",
                      borderTop: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                      {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {n.type === "hold" && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <button
                          onClick={() => {
                            setIsOpen(false);
                            onOpenHoldsDrawer();
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#0284c7",
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          View Hold
                        </button>
                        <button
                          onClick={() => handleCaptureDirect(n)}
                          disabled={capturingId === n.paymentRecordId}
                          style={{
                            background: "var(--neo-green)",
                            border: "1px solid #121212",
                            borderRadius: "var(--radius-pill)",
                            padding: "3px 10px",
                            fontSize: "11px",
                            fontWeight: 900,
                            color: "#121212",
                            cursor: "pointer",
                            boxShadow: "1px 1px 0px #121212",
                          }}
                        >
                          {capturingId === n.paymentRecordId ? "Capturing..." : "💸 Capture"}
                        </button>
                      </div>
                    )}

                    {n.type === "escalation" && (
                      <Link
                        href="/escalations"
                        onClick={() => setIsOpen(false)}
                        style={{
                          background: "var(--neo-yellow)",
                          border: "1px solid #121212",
                          borderRadius: "var(--radius-pill)",
                          padding: "3px 10px",
                          fontSize: "11px",
                          fontWeight: 900,
                          color: "#121212",
                          textDecoration: "none",
                          boxShadow: "1px 1px 0px #121212",
                        }}
                      >
                        Review SLA &rarr;
                      </Link>
                    )}

                    {n.type === "captured" && (
                      <Link
                        href="/ledger"
                        onClick={() => setIsOpen(false)}
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#059669",
                          textDecoration: "none",
                        }}
                      >
                        View in Ledger &rarr;
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Popover Footer: Open Full Active Holds Drawer */}
          <div
            style={{
              padding: "10px 14px",
              background: "#ffffff",
              borderTop: "var(--border-thick)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenHoldsDrawer();
              }}
              style={{
                width: "100%",
                padding: "8px",
                background: "var(--neo-blue-light)",
                border: "1.5px solid #121212",
                borderRadius: "var(--radius-sm)",
                fontSize: "12px",
                fontWeight: 900,
                color: "#1e3a8a",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <CreditCard size={14} />
              <span>Open Active Holds Drawer ({summary.activeHoldsCount} Active) &rarr;</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
