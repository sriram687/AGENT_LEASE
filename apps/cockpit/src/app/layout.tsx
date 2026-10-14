import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { SessionProvider } from "@/components/auth/SessionProvider";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-main",
});

export const metadata: Metadata = {
  title: "Agent Leash — Payment Control Center",
  description:
    "Cryptographically-constrained payment gateway for AI agents. Define spending mandates, review escalations, and audit every transaction.",
  keywords: ["AI payments", "PayPal", "MCP", "agent safety", "payment gateway"],
  openGraph: {
    title: "Agent Leash — Payment Control Center",
    description: "Make autonomous AI spending safe and auditable.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body style={{ backgroundColor: "var(--color-canvas)", color: "var(--color-ink-primary)" }}>
        <SessionProvider>
          <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
            <Sidebar />
            <div style={{ display: "flex", flex: 1, flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
              <TopBar />
              <main style={{ flex: 1, overflowY: "auto", padding: "28px" }}>{children}</main>
            </div>
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#ffffff",
                color: "#121212",
                border: "2.5px solid #121212",
                borderRadius: "12px",
                fontWeight: 600,
                boxShadow: "4px 4px 0px #121212",
              },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  );
}
