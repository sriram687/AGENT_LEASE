"use client";

import { useState } from "react";
import { Bell, Search, ShieldCheck } from "lucide-react";
import { useSession } from "next-auth/react";
import { ProfileDrawer } from "@/components/profile/ProfileDrawer";

export function TopBar() {
  const { data: session } = useSession();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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
          padding: "0 28px",
          background: "#ffffff",
          flexShrink: 0,
        }}
      >
        {/* Search Bar */}
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

          {/* Interactive Operator Profile button */}
          <button
            onClick={() => setIsProfileOpen(true)}
            aria-label="Open Operator Profile"
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
              {displayName[0]?.toUpperCase() ?? "U"}
            </div>
            <span>{displayName}</span>
          </button>
        </div>
      </header>

      {/* Profile Drawer */}
      <ProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onProfileUpdated={(newName) => setOperatorName(newName)}
      />
    </>
  );
}
