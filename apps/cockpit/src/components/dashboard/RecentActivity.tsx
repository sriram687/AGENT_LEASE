"use client";

import { useEffect, useState } from "react";
import { Activity, ShoppingBag } from "lucide-react";

interface ActivityItem {
  id: string;
  type: "APPROVE" | "DENY" | "ESCALATE";
  item: string;
  amountCents: number;
  timestamp: string;
  justification?: string;
}

const typeStyles = {
  APPROVE: {
    badge: "badge-approved",
    dot: "#10b981",
    label: "Approved",
  },
  DENY: {
    badge: "badge-denied",
    dot: "#ef4444",
    label: "Denied",
  },
  ESCALATE: {
    badge: "badge-escalated",
    dot: "#f59e0b",
    label: "Escalated",
  },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function RecentActivity() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/recent-activity")
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="card"
      style={{
        padding: "24px",
        minHeight: "360px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          borderBottom: "var(--border-thin)",
          paddingBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Activity size={18} strokeWidth={2.5} color="#121212" />
          <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#121212", letterSpacing: "-0.01em" }}>
            RECENT ACTIVITY
          </h2>
        </div>
        <span
          style={{
            background: "var(--neo-green-light)",
            border: "1.5px solid #121212",
            borderRadius: "var(--radius-pill)",
            padding: "2px 10px",
            fontSize: "11px",
            fontWeight: 800,
          }}
        >
          {items.length} items
        </span>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: "#6b7280", fontSize: "13px", fontWeight: 600 }}>Loading activity…</div>
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            background: "#f8faf5",
            border: "2px dashed #121212",
            borderRadius: "var(--radius-md)",
            padding: "24px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "var(--neo-yellow)",
              border: "2px solid #121212",
              boxShadow: "2px 2px 0px #121212",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShoppingBag size={24} color="#121212" strokeWidth={2} />
          </div>
          <p style={{ color: "#4b5563", fontSize: "13px", fontWeight: 700, textAlign: "center" }}>
            No purchase requests recorded yet.
            <br />
            <span style={{ fontWeight: 500, fontSize: "12px", color: "#6b7280" }}>
              Trigger the demo agent to generate actions.
            </span>
          </p>
        </div>
      ) : (
        <ul
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            listStyle: "none",
          }}
        >
          {items.map((item) => {
            const style = typeStyles[item.type] ?? typeStyles.APPROVE;
            return (
              <li
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "10px 14px",
                  background: "#f8faf5",
                  border: "1.5px solid #121212",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "2px 2px 0px #121212",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#121212",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.item}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--neo-purple)" }}>
                      ${(item.amountCents / 100).toFixed(2)}
                    </span>
                    <span style={{ color: "#9ca3af" }}>•</span>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280" }}>
                      {timeAgo(item.timestamp)}
                    </span>
                  </div>
                </div>

                <span className={`badge ${style.badge}`}>{style.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
