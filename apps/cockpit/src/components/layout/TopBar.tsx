"use client";

import { Bell, User, ChevronDown } from "lucide-react";
import { useSession } from "next-auth/react";

export function TopBar() {
  const { data: session } = useSession();

  return (
    <header
      className="flex h-14 items-center justify-between border-b px-6"
      style={{
        background: "var(--color-surface-1)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Left: breadcrumb is injected per-page via Next.js metadata */}
      <div />

      {/* Right: notifications + user */}
      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <button
          id="notification-bell"
          aria-label="View notifications"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/5"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <Bell size={16} />
          {/* Unread dot */}
          <span
            className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--color-escalated)" }}
          />
        </button>

        {/* User menu */}
        <button
          id="user-menu"
          aria-label="User menu"
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors hover:bg-white/5"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
            style={{ background: "var(--color-brand-700)", color: "#93c5fd" }}
          >
            {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <span
            className="hidden text-sm font-medium sm:block"
            style={{ color: "var(--color-text-primary)" }}
          >
            {session?.user?.name ?? "Operator"}
          </span>
          <ChevronDown size={14} />
        </button>
      </div>
    </header>
  );
}
