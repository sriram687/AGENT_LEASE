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
import clsx from "clsx";

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
      className="flex h-full w-60 flex-col border-r"
      style={{
        background: "var(--color-surface-1)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: "var(--color-border)" }}>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: "var(--color-brand-600)" }}
        >
          <Zap size={16} color="#fff" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-50">Agent Leash</div>
          <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Payment Gateway
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-blue-600/10 text-blue-400 border border-blue-600/20"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              )}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 1.5} />
              <span className="flex-1">{label}</span>
              {badge && (
                <span
                  className="h-2 w-2 rounded-full animate-pulse"
                  style={{ background: "var(--color-escalated)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sandbox environment badge */}
      <div className="px-4 py-4 border-t" style={{ borderColor: "var(--color-border)" }}>
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.2)",
            color: "#f59e0b",
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "#f59e0b" }}
          />
          PayPal Sandbox
        </div>
      </div>
    </aside>
  );
}
