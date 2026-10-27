"use client";

import { useState, useMemo } from "react";
import { AgCharts } from "ag-charts-react";
import type { AgChartOptions } from "ag-charts-community";
import { TrendingUp, Layers, DollarSign, ShieldAlert, BarChart2 } from "lucide-react";

export interface SpendDataPoint {
  date: string;
  dateLabel?: string;
  spentCents: number;
  reservedCents: number;
  dailySpentCents?: number;
  dailyReservedCents?: number;
}

interface SpendChartProps {
  data: SpendDataPoint[];
}

export function SpendChart({ data }: SpendChartProps) {
  const [viewMode, setViewMode] = useState<"cumulative" | "daily">("cumulative");

  // Calculate high-level KPIs
  const latestPoint = data[data.length - 1];
  const currentSpentDollars = ((latestPoint?.spentCents ?? 0) / 100).toFixed(2);
  const currentReservedDollars = ((latestPoint?.reservedCents ?? 0) / 100).toFixed(2);

  // Maximum value for dynamic axis scaling
  const maxVal = useMemo(() => {
    let max = 0;
    for (const d of data) {
      const s = (viewMode === "cumulative" ? d.spentCents : (d.dailySpentCents ?? d.spentCents)) / 100;
      const r = (viewMode === "cumulative" ? d.reservedCents : (d.dailyReservedCents ?? d.reservedCents)) / 100;
      if (s > max) max = s;
      if (r > max) max = r;
    }
    return max;
  }, [data, viewMode]);

  const yAxisMax = Math.max(100, Math.ceil(maxVal * 1.25));

  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      // Safe fallback with 7 continuous days
      const now = new Date();
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - i));
        return {
          date: d,
          spent: 0,
          reserved: 0,
        };
      });
    }

    return data.map((d) => ({
      date: new Date(d.date),
      spent: (viewMode === "cumulative" ? d.spentCents : (d.dailySpentCents ?? d.spentCents)) / 100,
      reserved: (viewMode === "cumulative" ? d.reservedCents : (d.dailyReservedCents ?? d.reservedCents)) / 100,
    }));
  }, [data, viewMode]);

  const options: AgChartOptions = useMemo(
    () => ({
      theme: {
        baseTheme: "ag-default",
        overrides: {
          common: {
            background: { fill: "transparent" },
            padding: { top: 12, right: 16, bottom: 12, left: 16 },
          },
        },
      },
      data: chartData,
      series: [
        {
          type: "area" as const,
          xKey: "date",
          yKey: "spent",
          yName: "Captured Spend ($)",
          fill: "rgba(99, 102, 241, 0.22)",
          stroke: "#4f46e5",
          strokeWidth: 3,
          marker: {
            enabled: true,
            fill: "#4f46e5",
            stroke: "#ffffff",
            strokeWidth: 2,
            size: 7,
          },
          tooltip: {
            renderer: (params: any) => {
              const rawDate = params.datum?.[params.xKey] ?? params.datum?.date ?? params.xValue;
              const dateObj = rawDate instanceof Date ? rawDate : new Date(rawDate);
              const dateStr = !isNaN(dateObj.getTime())
                ? dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : String(rawDate ?? "");
              const rawVal = params.datum?.[params.yKey] ?? params.yValue ?? 0;
              const val = Number(rawVal).toFixed(2);
              return {
                title: "Captured Spend ($)",
                content: `${dateStr}: $${val}`,
                color: "#121212",
                backgroundColor: "#e0e7ff",
              };
            },
          },
        },
        {
          type: "area" as const,
          xKey: "date",
          yKey: "reserved",
          yName: "Reserved in Escrow ($)",
          fill: "rgba(245, 158, 11, 0.22)",
          stroke: "#d97706",
          strokeWidth: 3,
          strokeDash: [4, 4],
          marker: {
            enabled: true,
            fill: "#f59e0b",
            stroke: "#ffffff",
            strokeWidth: 2,
            size: 7,
          },
          tooltip: {
            renderer: (params: any) => {
              const rawDate = params.datum?.[params.xKey] ?? params.datum?.date ?? params.xValue;
              const dateObj = rawDate instanceof Date ? rawDate : new Date(rawDate);
              const dateStr = !isNaN(dateObj.getTime())
                ? dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : String(rawDate ?? "");
              const rawVal = params.datum?.[params.yKey] ?? params.yValue ?? 0;
              const val = Number(rawVal).toFixed(2);
              return {
                title: "Reserved in Escrow ($)",
                content: `${dateStr}: $${val}`,
                color: "#121212",
                backgroundColor: "#fef3c7",
              };
            },
          },
        },
      ],
      axes: [
        {
          type: "time" as const,
          position: "bottom" as const,
          label: {
            format: "%b %d",
            color: "#121212",
            fontSize: 12,
            fontWeight: "bold",
          },
          line: { color: "#121212", width: 2 },
          gridLine: { style: [{ stroke: "#e2e8f0", lineDash: [3, 3] }] },
        },
        {
          type: "number" as const,
          position: "left" as const,
          min: 0,
          max: yAxisMax,
          label: {
            formatter: (p: { value: number }) => `$${p.value.toFixed(0)}`,
            color: "#121212",
            fontSize: 12,
            fontWeight: "bold",
          },
          line: { color: "#121212", width: 2 },
          gridLine: { style: [{ stroke: "#e2e8f0", lineDash: [3, 3] }] },
        },
      ],
      legend: {
        enabled: true,
        position: "top" as const,
        item: {
          label: { color: "#121212", fontSize: 12, fontWeight: "bold" },
        },
      },
      tooltip: {
        enabled: true,
      },
    }),
    [chartData, yAxisMax]
  );

  return (
    <div
      className="card"
      style={{
        padding: "22px 24px",
        minHeight: "380px",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        border: "var(--border-thick)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-base)",
      }}
    >
      {/* Chart Top Header & Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
          borderBottom: "var(--border-thin)",
          paddingBottom: "14px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 900,
                color: "#121212",
                letterSpacing: "-0.01em",
                margin: 0,
              }}
            >
              SPEND & ESCROW TIMELINE
            </h3>
            <span
              style={{
                background: "var(--neo-green-light)",
                border: "1px solid #121212",
                borderRadius: "var(--radius-pill)",
                padding: "2px 8px",
                fontSize: "10px",
                fontWeight: 800,
                color: "#065f46",
              }}
            >
              LIVE 2PC TELEMETRY
            </span>
          </div>
          <p style={{ fontSize: "12px", fontWeight: 500, color: "#6b7280", margin: "2px 0 0 0" }}>
            Continuous tracking of settled payments and active PayPal 2PC holds
          </p>
        </div>

        {/* Live Metrics Badges & View Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Spent metric badge */}
          <div
            style={{
              background: "#eef2ff",
              border: "1.5px solid #6366f1",
              borderRadius: "var(--radius-pill)",
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: 800,
              color: "#3730a3",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4f46e5" }} />
            <span>Spent: ${currentSpentDollars}</span>
          </div>

          {/* Reserved metric badge */}
          <div
            style={{
              background: "#fffbeb",
              border: "1.5px solid #f59e0b",
              borderRadius: "var(--radius-pill)",
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: 800,
              color: "#92400e",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#f59e0b" }} />
            <span>Holds: ${currentReservedDollars}</span>
          </div>

          {/* Cumulative vs Daily Toggle Buttons */}
          <div
            style={{
              display: "flex",
              background: "#f1f5f9",
              border: "1.5px solid #121212",
              borderRadius: "var(--radius-pill)",
              padding: "2px",
            }}
          >
            <button
              onClick={() => setViewMode("cumulative")}
              style={{
                padding: "3px 10px",
                borderRadius: "var(--radius-pill)",
                border: "none",
                background: viewMode === "cumulative" ? "#121212" : "transparent",
                color: viewMode === "cumulative" ? "#ffffff" : "#4b5563",
                fontSize: "11px",
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 0.1s ease",
              }}
            >
              Cumulative
            </button>
            <button
              onClick={() => setViewMode("daily")}
              style={{
                padding: "3px 10px",
                borderRadius: "var(--radius-pill)",
                border: "none",
                background: viewMode === "daily" ? "#121212" : "transparent",
                color: viewMode === "daily" ? "#ffffff" : "#4b5563",
                fontSize: "11px",
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 0.1s ease",
              }}
            >
              Daily Flow
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div style={{ flex: 1, minHeight: "280px", width: "100%" }}>
        <AgCharts options={options} style={{ height: 280 }} />
      </div>
    </div>
  );
}
