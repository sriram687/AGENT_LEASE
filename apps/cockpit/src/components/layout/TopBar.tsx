"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Search,
  ShieldCheck,
  Menu,
  X,
  LayoutDashboard,
  FileText,
  AlertTriangle,
  BookOpen,
  BarChart2,
  Shield,
  Settings,
  Zap,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { ProfileDrawer } from "@/components/profile/ProfileDrawer";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mandates", label: "Mandates", icon: FileText },
  { href: "/escalations", label: "Escalations", icon: AlertTriangle, badge: "LIVE" },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/security", label: "Security", icon: Shield },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function TopBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [operatorName, setOperatorName] = useState<string | null>(null);

  const displayName = operatorName ?? session?.user?.name ?? "Operator";

  return (
    <>
      <header
        style={{
          display: "flex",
          height: "64px",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "var(--border-thick)",
          padding: "0 20px",
          background: "#ffffff",
          flexShrink: 0,
          gap: "12px",
        }}
      >
        {/* Left Section: Mobile Menu Button & Search Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
          {/* Mobile hamburger button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="mobile-menu-btn"
            style={{
              display: "none",
              height: "40px",
              width: "40px",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--radius-sm)",
              background: "var(--neo-yellow)",
              border: "var(--border-medium)",
              boxShadow: "var(--shadow-sm)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {isMobileMenuOpen ? <X size={20} color="#121212" /> : <Menu size={20} color="#121212" />}
          </button>

          {/* Search Bar */}
          <div
            className="topbar-search-container"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "#f4f6f0",
              border: "var(--border-medium)",
              borderRadius: "var(--radius-pill)",
              padding: "7px 16px",
              width: "360px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Search size={16} color="#121212" strokeWidth={2.5} />
            <input
              type="text"
              placeholder="Search mandates, agents..."
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "13px",
                fontWeight: 600,
                color: "#121212",
                width: "100%",
                fontFamily: "inherit",
              }}
            />
          </div>
        </div>

        {/* Right Section: Security badge, Bell, Operator profile */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          {/* Security badge pill */}
          <div
            style={{
              display: "none",
              alignItems: "center",
              gap: "6px",
              background: "var(--neo-green-light)",
              border: "var(--border-thin)",
              padding: "5px 12px",
              borderRadius: "var(--radius-pill)",
              fontSize: "12px",
              fontWeight: 800,
              color: "#064e3b",
            }}
            className="sm:flex"
          >
            <ShieldCheck size={15} strokeWidth={2.5} />
            <span>Ed25519 Enforced</span>
          </div>

          {/* Notification bell pill */}
          <button
            id="notification-bell"
            aria-label="View notifications"
            style={{
              position: "relative",
              display: "flex",
              height: "40px",
              width: "40px",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--radius-pill)",
              background: "#ffffff",
              border: "var(--border-medium)",
              boxShadow: "var(--shadow-sm)",
              cursor: "pointer",
              transition: "transform 0.1s ease",
            }}
          >
            <Bell size={18} color="#121212" strokeWidth={2.2} />
            <span
              style={{
                position: "absolute",
                right: "2px",
                top: "2px",
                height: "10px",
                width: "10px",
                borderRadius: "50%",
                background: "var(--neo-orange)",
                border: "1.5px solid #121212",
              }}
            />
          </button>

          {/* Interactive Operator Profile button */}
          <button
            onClick={() => setIsProfileOpen(true)}
            aria-label="Open Operator Profile"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--neo-purple)",
              color: "#ffffff",
              border: "var(--border-medium)",
              borderRadius: "var(--radius-pill)",
              padding: "5px 14px 5px 6px",
              boxShadow: "var(--shadow-sm)",
              fontWeight: 800,
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s ease",
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
            <div
              style={{
                display: "flex",
                height: "28px",
                width: "28px",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                background: "var(--neo-yellow)",
                color: "#121212",
                border: "1.5px solid #121212",
                fontWeight: 900,
                fontSize: "12px",
              }}
            >
              {displayName[0]?.toUpperCase() ?? "U"}
            </div>
            <span className="operator-btn-name">{displayName}</span>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer Modal */}
      {isMobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            backgroundColor: "rgba(18, 18, 18, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            flexDirection: "column",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMobileMenuOpen(false);
          }}
        >
          <div
            style={{
              width: "280px",
              height: "100%",
              background: "#ffffff",
              borderRight: "var(--border-thick)",
              boxShadow: "var(--shadow-xl)",
              display: "flex",
              flexDirection: "column",
              animation: "fadeIn 0.15s ease",
            }}
          >
            {/* Mobile Nav Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "var(--border-thick)",
                background: "var(--neo-yellow)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Zap size={20} color="#121212" strokeWidth={2.5} />
                <span style={{ fontWeight: 900, fontSize: "15px", letterSpacing: "-0.02em" }}>
                  AGENT LEASH
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  background: "#ffffff",
                  border: "1.5px solid #121212",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Navigation links */}
            <nav
              style={{
                flex: 1,
                padding: "16px 12px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                overflowY: "auto",
              }}
            >
              {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
                const active = pathname === href || (href !== "/" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsMobileMenuOpen(false)}
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
                    }}
                  >
                    <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                    <span style={{ flex: 1 }}>{label}</span>
                    {badge && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 900,
                          padding: "2px 8px",
                          borderRadius: "var(--radius-pill)",
                          background: "var(--neo-yellow)",
                          border: "1px solid #121212",
                          color: "#121212",
                        }}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Footer */}
            <div style={{ padding: "16px", borderTop: "var(--border-thick)", background: "#f8faf5" }}>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsProfileOpen(true);
                }}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "var(--neo-yellow)",
                  border: "var(--border-medium)",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: "var(--shadow-sm)",
                  fontWeight: 800,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Operator Profile Drawer &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Drawer */}
      <ProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onProfileUpdated={(newName) => setOperatorName(newName)}
      />
    </>
  );
}
