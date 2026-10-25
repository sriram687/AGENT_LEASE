import { getAnalyticsData } from "@/lib/api/analytics";
import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts";
import { StatCard } from "@/components/dashboard/StatCard";
import { DollarSign, Lock, CheckCircle2, ShieldAlert, BarChart3, TrendingUp } from "lucide-react";

export const metadata = { title: "Analytics — Agent Leash" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const data = await getAnalyticsData();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="animate-fade-in">
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          background: "#ffffff",
          border: "var(--border-thick)",
          borderRadius: "var(--radius-lg)",
          padding: "20px 24px",
          boxShadow: "var(--shadow-base)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 900, color: "#121212", letterSpacing: "-0.02em" }}>
              FINANCIAL & AGENT ANALYTICS
            </h1>
            <span
              style={{
                background: "var(--neo-yellow)",
                border: "1.5px solid #121212",
                padding: "2px 10px",
                borderRadius: "var(--radius-pill)",
                fontSize: "11px",
                fontWeight: 800,
                boxShadow: "1.5px 1.5px 0px #121212",
              }}
            >
              REAL-TIME
            </span>
          </div>
          <p style={{ fontSize: "13px", fontWeight: 500, color: "#4b5563", marginTop: "4px" }}>
            Aggregated spend metrics, merchant categorization, and 2PC hold conversion rates.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--neo-green-light)",
            border: "var(--border-medium)",
            borderRadius: "var(--radius-pill)",
            padding: "8px 16px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <TrendingUp size={16} strokeWidth={2.5} color="#064e3b" />
          <span style={{ fontSize: "12px", fontWeight: 800, color: "#064e3b" }}>
            {data.totalRequests} TOTAL TRANSACTIONS
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "18px",
        }}
      >
        <StatCard
          label="Total Volume"
          value={`$${(data.totalVolumeCents / 100).toFixed(2)}`}
          sub="Gross requested by agents"
          color="brand"
          icon={<DollarSign size={16} color="#121212" strokeWidth={2.5} />}
        />
        <StatCard
          label="Active 2PC Holds"
          value={`$${(data.reservedCents / 100).toFixed(2)}`}
          sub="Reserved in PayPal Sandbox"
          color="amber"
          icon={<Lock size={16} color="#121212" strokeWidth={2.5} />}
        />
        <StatCard
          label="Captured Spend"
          value={`$${(data.capturedCents / 100).toFixed(2)}`}
          sub="Deducted on delivery confirmation"
          color="green"
          icon={<CheckCircle2 size={16} color="#121212" strokeWidth={2.5} />}
        />
        <StatCard
          label="Policy Interception"
          value={`${data.interceptionCount}`}
          sub={`${data.escalationRate}% escalated or blocked`}
          color="red"
          icon={<ShieldAlert size={16} color="#121212" strokeWidth={2.5} />}
        />
      </div>

      {/* Visual Analytics */}
      <AnalyticsCharts data={data} />
    </div>
  );
}
