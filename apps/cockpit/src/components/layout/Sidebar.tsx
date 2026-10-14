"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  AlertTriangle,
  BookOpen,
  BarChart2,
  Shield,
  Settings,
  Zap,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mandates", label: "Mandates", icon: FileText },
  { href: "/escalations", label: "Escalations", icon: AlertTriangle, badge: true },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/security", label: "Security", icon: Shield },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        display: "flex",
        height: "100%",
        width: "250px",
        flexDirection: "column",
        background: "#ffffff",
        borderRight: "var(--border-thick)",
        flexShrink: 0,
      }}
    >
      {/* Brand Logo Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "20px",
          borderBottom: "var(--border-thick)",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            height: "40px",
            width: "40px",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "10px",
            background: "var(--neo-yellow)",
            border: "var(--border-medium)",
            boxShadow: "2px 2px 0px #121212",
          }}
        >
          <Zap size={22} color="#121212" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#121212", letterSpacing: "-0.02em" }}>
            AGENT LEASH
          </div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#4f46e5",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Payment Gateway
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {NAV.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 14px",
                borderRadius: "var(--radius-pill)",
                fontSize: "14px",
                fontWeight: active ? 800 : 600,
                color: active ? "#ffffff" : "#121212",
                background: active ? "var(--neo-purple)" : "transparent",
                border: active ? "var(--border-medium)" : "2px solid transparent",
                boxShadow: active ? "var(--shadow-sm)" : "none",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              <span style={{ flex: 1 }}>{label}</span>
              {badge && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-pill)",
                    fontSize: "10px",
                    fontWeight: 900,
                    background: active ? "#ffffff" : "var(--neo-yellow)",
                    color: "#121212",
                    border: "1.5px solid #121212",
                    boxShadow: "1px 1px 0px #121212",
                  }}
                >
                  LIVE
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sandbox environment badge */}
      <div
        style={{
          padding: "16px",
          borderTop: "var(--border-thick)",
          background: "#f8faf5",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            borderRadius: "var(--radius-pill)",
            padding: "8px 14px",
            fontSize: "12px",
            fontWeight: 800,
            background: "var(--neo-yellow)",
            border: "var(--border-medium)",
            boxShadow: "var(--shadow-sm)",
            color: "#121212",
          }}
        >
          <span
            style={{
              height: "8px",
              width: "8px",
              borderRadius: "50%",
              background: "#121212",
              display: "inline-block",
            }}
          />
          PayPal Sandbox
        </div>
      </div>
    </aside>
  );
}
