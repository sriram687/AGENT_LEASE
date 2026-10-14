"use client";

import { Bell, Search, ShieldCheck } from "lucide-react";
import { useSession } from "next-auth/react";

export function TopBar() {
  const { data: session } = useSession();

  return (
    <header
      style={{
        display: "flex",
        height: "64px",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "var(--border-thick)",
        padding: "0 28px",
        background: "#ffffff",
        flexShrink: 0,
      }}
    >
      {/* Search Bar style like reference */}
      <div
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
          placeholder="Search mandates, agents, transactions..."
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

      {/* Right controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
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

        {/* User button / login badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "var(--neo-purple)",
            color: "#ffffff",
            border: "var(--border-medium)",
            borderRadius: "var(--radius-pill)",
            padding: "5px 16px 5px 6px",
            boxShadow: "var(--shadow-sm)",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              display: "flex",
              height: "30px",
              width: "30px",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: "var(--neo-yellow)",
              color: "#121212",
              border: "1.5px solid #121212",
              fontWeight: 900,
              fontSize: "13px",
            }}
          >
            {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <span>{session?.user?.name ?? "Operator"}</span>
        </div>
      </div>
    </header>
  );
}
