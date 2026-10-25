"use client";

import { AgCharts } from "ag-charts-react";
import type { AgChartOptions } from "ag-charts-community";
import { useMemo } from "react";

interface SpendDataPoint {
  date: string;
  spentCents: number;
  reservedCents: number;
}

interface SpendChartProps {
  data: SpendDataPoint[];
}

export function SpendChart({ data }: SpendChartProps) {
  const options: AgChartOptions = useMemo(
    () => ({
      theme: {
        baseTheme: "ag-default",
        overrides: {
          common: {
            background: { fill: "transparent" },
            padding: { top: 16, right: 16, bottom: 16, left: 16 },
          },
        },
      },
      data:
        data.length > 0
          ? data.map((d) => ({
              date: new Date(d.date),
              spent: d.spentCents / 100,
              reserved: d.reservedCents / 100,
            }))
          : [
              {
                date: new Date(),
                spent: 0,
                reserved: 0,
              },
            ],
      series: [
        {
          type: "area" as const,
          xKey: "date",
          yKey: "spent",
          yName: "Spent ($)",
          fill: "rgba(99, 102, 241, 0.25)",
          stroke: "#4f46e5",
          strokeWidth: 3,
          marker: { enabled: true, fill: "#4f46e5", stroke: "#121212", strokeWidth: 2, size: 6 },
        },
        {
          type: "area" as const,
          xKey: "date",
          yKey: "reserved",
          yName: "Reserved ($)",
          fill: "rgba(250, 204, 21, 0.25)",
          stroke: "#d97706",
          strokeWidth: 3,
          strokeDash: [5, 5],
          marker: { enabled: true, fill: "#facc15", stroke: "#121212", strokeWidth: 2, size: 6 },
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
          label: { color: "#121212", fontSize: 13, fontWeight: "bold" },
        },
      },
      tooltip: { enabled: true },
    }),
    [data]
  );

  return (
    <div
      className="card"
      style={{
        padding: "24px",
        minHeight: "360px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          borderBottom: "var(--border-thin)",
          paddingBottom: "12px",
        }}
      >
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#121212", letterSpacing: "-0.01em" }}>
            SPEND TIMELINE
          </h3>
          <p style={{ fontSize: "12px", fontWeight: 500, color: "#6b7280", marginTop: "2px" }}>
            Mandate consumption & reserved holds
          </p>
        </div>
        <span
          style={{
            background: "#f1f5f9",
            border: "1.5px solid #121212",
            borderRadius: "var(--radius-pill)",
            padding: "4px 12px",
            fontSize: "11px",
            fontWeight: 800,
          }}
        >
          USD ($)
        </span>
      </div>
      <div style={{ flex: 1, minHeight: "260px" }}>
        <AgCharts options={options} style={{ height: 260 }} />
      </div>
    </div>
  );
}
