import { Suspense } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { SpendChart } from "@/components/dashboard/SpendChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { EscalationAlert } from "@/components/dashboard/EscalationAlert";
import { ChainStatus } from "@/components/dashboard/ChainStatus";
import { getMandateSummary } from "@/lib/api/mandates";
import { getPendingEscalations } from "@/lib/api/escalations";
import { getSpendTimeline } from "@/lib/api/ledger";

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
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-50">Command Center</h1>
          <p className="text-sm text-gray-400 mt-1">
            All agent spending activity, audit trail, and policy controls
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <span className="text-xs text-gray-400 font-medium">Live</span>
        </div>
      </div>

      {/* Pending escalations banner */}
      {pendingEscalations.length > 0 && (
        <EscalationAlert count={pendingEscalations.length} />
      )}

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Budget"
          value={`$${((mandateSummary?.totalBudgetCents ?? 0) / 100).toFixed(2)}`}
          sub="Mandate ceiling"
          color="brand"
        />
        <StatCard
          label="Spent"
          value={`$${((mandateSummary?.spentCents ?? 0) / 100).toFixed(2)}`}
          sub={`${budgetUtilization}% utilized`}
          color="violet"
        />
        <StatCard
          label="Reserved"
          value={`$${((mandateSummary?.reservedCents ?? 0) / 100).toFixed(2)}`}
          sub="Open authorizations"
          color="amber"
        />
        <StatCard
          label="Available"
          value={`$${(((mandateSummary?.totalBudgetCents ?? 0) - (mandateSummary?.spentCents ?? 0) - (mandateSummary?.reservedCents ?? 0)) / 100).toFixed(2)}`}
          sub="Remaining for agent"
          color="green"
        />
      </div>

      {/* Charts + activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<ChartSkeleton />}>
            <SpendChart data={spendTimeline} />
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<ActivitySkeleton />}>
            <RecentActivity />
          </Suspense>
        </div>
      </div>

      {/* Ledger chain integrity */}
      <ChainStatus />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="card p-6 h-64 flex items-center justify-center">
      <div className="text-gray-500 text-sm">Loading spend data…</div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="card p-6 h-64 flex items-center justify-center">
      <div className="text-gray-500 text-sm">Loading activity…</div>
    </div>
  );
}
