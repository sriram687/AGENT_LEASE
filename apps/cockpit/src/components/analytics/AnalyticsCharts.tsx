"use client";

import { useMemo } from "react";
import { AgCharts } from "ag-charts-react";
import type { AgChartOptions } from "ag-charts-community";
import { Server, Building2, ShoppingBag, ShieldCheck, ArrowUpRight, TrendingUp } from "lucide-react";
import type { AnalyticsSummary } from "@/lib/api/analytics";

interface AnalyticsChartsProps {
  data: AnalyticsSummary;
}

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  // 1. Category Bar Chart Options
  const categoryOptions: AgChartOptions = useMemo(
    () => ({
      theme: {
        baseTheme: "ag-default",
        overrides: {
          common: {
            background: { fill: "transparent" },
            padding: { top: 12, right: 12, bottom: 12, left: 12 },
          },
        },
      },
      data: data.categoryBreakdown.map((c) => ({
        category: c.category.length > 20 ? c.category.slice(0, 18) + "…" : c.category,
        amount: c.volumeCents / 100,
      })),
      series: [
        {
          type: "bar" as const,
          xKey: "category",
          yKey: "amount",
          yName: "Spend ($)",
          fill: "#6366f1",
          stroke: "#121212",
          strokeWidth: 2,
          cornerRadius: 4,
        },
      ],
      axes: [
        {
          type: "category" as const,
          position: "bottom" as const,
          label: { color: "#121212", fontSize: 11, fontWeight: "bold" },
          line: { color: "#121212", width: 2 },
        },
        {
          type: "number" as const,
          position: "left" as const,
          label: {
            formatter: (p: { value: number }) => `$${p.value}`,
            color: "#121212",
            fontSize: 11,
            fontWeight: "bold",
          },
          line: { color: "#121212", width: 2 },
        },
      ],
      legend: { enabled: false },
    }),
    [data.categoryBreakdown]
  );

  // 2. 2PC Status Distribution Donut Options
  const statusOptions: AgChartOptions = useMemo(
    () => ({
      theme: {
        baseTheme: "ag-default",
        overrides: {
          common: {
            background: { fill: "transparent" },
            padding: { top: 12, right: 12, bottom: 12, left: 12 },
          },
        },
      },
      data: data.statusDistribution.map((s) => ({
        status: s.status,
        count: s.count,
      })),
      series: [
        {
          type: "donut" as const,
          calloutLabelKey: "status",
          angleKey: "count",
          innerRadiusRatio: 0.65,
          fills: ["#10b981", "#6366f1", "#f59e0b", "#ef4444"],
          strokes: ["#121212", "#121212", "#121212", "#121212"],
          strokeWidth: 2,
        },
      ],
      legend: {
        enabled: true,
        position: "bottom" as const,
        item: {
          label: { color: "#121212", fontSize: 11, fontWeight: "bold" },
        },
      },
    }),
    [data.statusDistribution]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Charts Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "24px",
        }}
      >
        {/* Category Breakdown */}
        <div className="card" style={{ padding: "22px", minHeight: "360px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
              borderBottom: "var(--border-thin)",
              paddingBottom: "10px",
            }}
          >
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 900, color: "#121212" }}>
                SPEND BY MERCHANT CATEGORY (MCC)
              </h3>
              <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                Categorical distribution of agent transactions
              </p>
            </div>
            <span
              style={{
                background: "var(--neo-purple-light)",
                border: "1.5px solid #121212",
                padding: "2px 8px",
                borderRadius: "var(--radius-pill)",
                fontSize: "11px",
                fontWeight: 800,
                color: "#4338ca",
              }}
            >
              MCC AUDIT
            </span>
          </div>
          <div style={{ height: "260px" }}>
            <AgCharts options={categoryOptions} style={{ height: 260 }} />
          </div>
        </div>

        {/* 2PC Status Conversion */}
        <div className="card" style={{ padding: "22px", minHeight: "360px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
              borderBottom: "var(--border-thin)",
              paddingBottom: "10px",
            }}
          >
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 900, color: "#121212" }}>
                2PC DECISION & HOLD BREAKDOWN
              </h3>
              <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                Hold authorization vs delivery capture vs escalations
              </p>
            </div>
            <span
              style={{
                background: "var(--neo-green-light)",
                border: "1.5px solid #121212",
                padding: "2px 8px",
                borderRadius: "var(--radius-pill)",
                fontSize: "11px",
                fontWeight: 800,
                color: "#065f46",
              }}
            >
              2PC RATIO
            </span>
          </div>
          <div style={{ height: "260px" }}>
            <AgCharts options={statusOptions} style={{ height: 260 }} />
          </div>
        </div>
      </div>

      {/* Leaderboards Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "24px",
        }}
      >
        {/* Top Vendors */}
        <div className="card" style={{ padding: "22px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
              borderBottom: "var(--border-thin)",
              paddingBottom: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Building2 size={18} color="#121212" strokeWidth={2.5} />
              <h3 style={{ fontSize: "15px", fontWeight: 900, color: "#121212" }}>
                TOP VENDORS BY VOLUME
              </h3>
            </div>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280" }}>
              {data.vendorLeaderboard.length} Merchants
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.vendorLeaderboard.slice(0, 5).map((v, idx) => (
              <div
                key={v.vendorName}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  background: "#f8fafc",
                  border: "1.5px solid #121212",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "2px 2px 0px #121212",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      height: "24px",
                      width: "24px",
                      borderRadius: "50%",
                      background: idx === 0 ? "var(--neo-yellow)" : "#ffffff",
                      border: "1.5px solid #121212",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 900,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#121212" }}>
                      {v.vendorName}
                    </div>
                    <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>
                      {v.count} transaction{v.count > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "14px", fontWeight: 900, color: "#4f46e5" }}>
                    ${(v.volumeCents / 100).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Activity */}
        <div className="card" style={{ padding: "22px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
              borderBottom: "var(--border-thin)",
              paddingBottom: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Server size={18} color="#121212" strokeWidth={2.5} />
              <h3 style={{ fontSize: "15px", fontWeight: 900, color: "#121212" }}>
                AGENT SPEND ALLOCATION
              </h3>
            </div>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280" }}>
              Active Autonomous Agents
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.agentSpendBreakdown.map((a) => (
              <div
                key={a.agentName}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  background: "#ffffff",
                  border: "1.5px solid #121212",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "2px 2px 0px #121212",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#121212" }}>
                    {a.agentName}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                    <span
                      style={{
                        height: "7px",
                        width: "7px",
                        borderRadius: "50%",
                        background: "#10b981",
                        display: "inline-block",
                      }}
                    />
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280" }}>
                      Authorized via Mandate
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "14px", fontWeight: 900, color: "#065f46" }}>
                    ${(a.totalCents / 100).toFixed(2)}
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280" }}>
                    {a.count} requests
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
