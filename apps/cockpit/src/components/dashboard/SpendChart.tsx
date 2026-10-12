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
        baseTheme: "ag-default-dark",
        overrides: {
          common: {
            background: { fill: "transparent" },
            padding: { top: 16, right: 16, bottom: 16, left: 16 },
          },
        },
      },
      data: data.map((d) => ({
        date: new Date(d.date),
        spent: d.spentCents / 100,
        reserved: d.reservedCents / 100,
      })),
      series: [
        {
          type: "area" as const,
          xKey: "date",
          yKey: "spent",
          yName: "Spent ($)",
          fill: "rgba(59,130,246,0.3)",
          stroke: "#3b82f6",
          strokeWidth: 2,
          marker: { enabled: false },
        },
        {
          type: "area" as const,
          xKey: "date",
          yKey: "reserved",
          yName: "Reserved ($)",
          fill: "rgba(245,158,11,0.15)",
          stroke: "#f59e0b",
          strokeWidth: 2,
          strokeDash: [4, 4],
          marker: { enabled: false },
        },
      ],
      axes: [
        {
          type: "time" as const,
          position: "bottom" as const,
          label: {
            format: "%b %d",
            color: "#64748b",
            fontSize: 11,
          },
          line: { color: "#1e293b" },
          gridLine: { style: [{ stroke: "#1e293b", lineDash: [4, 4] }] },
        },
        {
          type: "number" as const,
          position: "left" as const,
          label: {
            formatter: (p: { value: number }) => `$${p.value.toFixed(0)}`,
            color: "#64748b",
            fontSize: 11,
          },
          line: { color: "#1e293b" },
          gridLine: { style: [{ stroke: "#1e293b", lineDash: [4, 4] }] },
        },
      ],
      legend: {
        enabled: true,
        position: "top" as const,
        item: {
          label: { color: "#94a3b8", fontSize: 12 },
        },
      },
      tooltip: { enabled: true },
    }),
    [data]
  );

  return (
    <div
      className="card p-6"
      style={{ height: 320 }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Spend Timeline</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Budget consumption over the mandate period
          </p>
        </div>
      </div>
      <AgCharts options={options} style={{ height: 240 }} />
    </div>
  );
}
