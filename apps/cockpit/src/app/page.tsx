import { Suspense } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { SpendChart } from "@/components/dashboard/SpendChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { EscalationAlert } from "@/components/dashboard/EscalationAlert";
import { ChainStatus } from "@/components/dashboard/ChainStatus";
import { AgentDispatchBar } from "@/components/dashboard/AgentDispatchBar";
import { getMandateSummary } from "@/lib/api/mandates";
import { getPendingEscalations } from "@/lib/api/escalations";
import { getSpendTimeline } from "@/lib/api/ledger";
import { DollarSign, PieChart, Lock, Sparkles } from "lucide-react";

export const metadata = {
  title: "Dashboard — Agent Leash",
};

export default async function DashboardPage() {
  const [mandateSummary, pendingEscalations, spendTimeline] = await Promise.all([
    getMandateSummary(),
    getPendingEscalations(),
    getSpendTimeline(),
  ]);

  const budgetUtilization = mandateSummary
    ? Math.round(
        ((mandateSummary.spentCents + mandateSummary.reservedCents) /
          mandateSummary.totalBudgetCents) *
          100
      )
    : 0;

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
            <h1
              style={{
                fontSize: "26px",
                fontWeight: 900,
                color: "#121212",
                letterSpacing: "-0.03em",
              }}
            >
              COMMAND CENTER
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
              V1.0
            </span>
          </div>
          <p
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "#4b5563",
              marginTop: "4px",
            }}
          >
            Cryptographically-governed spending mandates, audit trail, and policy controls
          </p>
        </div>

        {/* Live Status Sticker */}
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
          <span className="live-dot" />
          <span style={{ fontSize: "12px", fontWeight: 800, color: "#064e3b" }}>
            GATEWAY ACTIVE
          </span>
        </div>
      </div>

      {/* Autonomous Agent Dispatch Studio */}
      <AgentDispatchBar />

      {/* Pending escalations alert */}
      {pendingEscalations.length > 0 && (
        <EscalationAlert count={pendingEscalations.length} />
      )}


      {/* KPI Stat Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "18px",
        }}
      >
        <StatCard
          label="Total Budget"
          value={`$${((mandateSummary?.totalBudgetCents ?? 0) / 100).toFixed(2)}`}
          sub="Mandate ceiling"
          color="brand"
          icon={<DollarSign size={16} color="#121212" strokeWidth={2.5} />}
        />
        <StatCard
          label="Spent"
          value={`$${((mandateSummary?.spentCents ?? 0) / 100).toFixed(2)}`}
          sub={`${budgetUtilization}% utilized`}
          color="violet"
          icon={<PieChart size={16} color="#121212" strokeWidth={2.5} />}
        />
        <StatCard
          label="Reserved"
          value={`$${((mandateSummary?.reservedCents ?? 0) / 100).toFixed(2)}`}
          sub="Open authorizations"
          color="amber"
          icon={<Lock size={16} color="#121212" strokeWidth={2.5} />}
        />
        <StatCard
          label="Available"
          value={`$${(((mandateSummary?.totalBudgetCents ?? 0) - (mandateSummary?.spentCents ?? 0) - (mandateSummary?.reservedCents ?? 0)) / 100).toFixed(2)}`}
          sub="Remaining for agent"
          color="green"
          icon={<Sparkles size={16} color="#121212" strokeWidth={2.5} />}
        />
      </div>

      {/* Chart + Recent Activity */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "24px",
        }}
      >
        <div style={{ flex: 2 }}>
          <Suspense fallback={<ChartSkeleton />}>
            <SpendChart data={spendTimeline} />
          </Suspense>
        </div>
        <div style={{ flex: 1 }}>
          <Suspense fallback={<ActivitySkeleton />}>
            <RecentActivity />
          </Suspense>
        </div>
      </div>

      {/* Ledger Chain Integrity */}
      <ChainStatus />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div
      className="card"
      style={{
        height: "360px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ color: "#6b7280", fontSize: "14px", fontWeight: 600 }}>Loading spend data…</div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div
      className="card"
      style={{
        height: "360px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ color: "#6b7280", fontSize: "14px", fontWeight: 600 }}>Loading activity…</div>
    </div>
  );
}
