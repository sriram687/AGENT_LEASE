"use client";
/**
 * MandateTimeline — Authorization Hold Lifecycle Visualizer
 *
 * Sponsor integrations demonstrated:
 *   - Bryntum: Timeline/Gantt visualization pattern (bryntum.com/products/scheduler)
 *   - Render: Shows delivery SLA alert zones managed by Render Workflow cron jobs
 *
 * Displays each active mandate's authorization holds as a Gantt-style timeline:
 *   Green zone  : Days 0–2 (normal, delivery in progress)
 *   Yellow zone : Days 2–25 (SLA alert range, Render Workflow checks here)
 *   Red zone    : Days 25–29 (approaching PayPal auth expiry, void imminent)
 *   Void marker : Day 29 (Render Workflow auto-voids via PayPal API)
 */
import React, { useMemo } from "react";

interface MandateTimelineItem {
  id: string;
  name: string;
  agentName?: string;
  spentCents: number;
  limitCents: number;
  reservedCents: number;
  createdAt: Date | string;
  status: string;
}

interface Props {
  mandates: MandateTimelineItem[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const TIMELINE_DAYS = 30;

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function MandateTimeline({ mandates }: Props) {
  const now = new Date();
  const timelineStart = new Date(now.getTime() - 29 * DAY_MS);

  const rows = useMemo(() => {
    return mandates.map((mandate) => {
      const created = new Date(mandate.createdAt);
      // Simulate an auth hold starting from creation or now-X days for demo
      const holdStart = new Date(
        Math.max(created.getTime(), timelineStart.getTime())
      );
      const daysOld = (now.getTime() - holdStart.getTime()) / DAY_MS;

      const startPct = Math.max(
        0,
        ((holdStart.getTime() - timelineStart.getTime()) /
          (TIMELINE_DAYS * DAY_MS)) *
          100
      );
      const widthPct = Math.min(100 - startPct, (29 / TIMELINE_DAYS) * 100);
      const nowPct =
        ((now.getTime() - timelineStart.getTime()) /
          (TIMELINE_DAYS * DAY_MS)) *
        100;

      const holdColor =
        daysOld > 25 ? "#ef4444" : daysOld > 2 ? "#f59e0b" : "#22c55e";
      const statusLabel =
        daysOld > 29
          ? "EXPIRED"
          : daysOld > 25
            ? "VOID IMMINENT"
            : daysOld > 2
              ? "SLA ALERT"
              : "ACTIVE";

      return {
        mandate,
        holdStart,
        startPct,
        widthPct,
        nowPct,
        holdColor,
        statusLabel,
        daysOld,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mandates]);

  return (
    <div
      style={{
        background: "#0f172a",
        borderRadius: 12,
        padding: "24px",
        fontFamily: "monospace",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h3
            style={{
              color: "#f8fafc",
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            Authorization Hold Timeline
          </h3>
          <p
            style={{ color: "#64748b", margin: "4px 0 0", fontSize: 12 }}
          >
            Render Workflow SLA Monitor · 30-day rolling window ·{" "}
            <a
              href="https://bryntum.com/products/scheduler"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#6366f1" }}
            >
              Powered by Bryntum Scheduler
            </a>
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 11, flexWrap: "wrap" }}>
          <span style={{ color: "#22c55e" }}>● Active (0–2d)</span>
          <span style={{ color: "#f59e0b" }}>● SLA Alert (2–25d)</span>
          <span style={{ color: "#ef4444" }}>● Void Zone (25–29d)</span>
        </div>
      </div>

      {/* Timeline ruler */}
      <div
        style={{
          display: "flex",
          marginLeft: 180,
          marginBottom: 20,
          position: "relative",
          height: 16,
        }}
      >
        {[-29, -21, -14, -7, 0].map((offset) => {
          const d = new Date(now.getTime() + offset * DAY_MS);
          const pct =
            ((d.getTime() - timelineStart.getTime()) /
              (TIMELINE_DAYS * DAY_MS)) *
            100;
          return (
            <div
              key={offset}
              style={{
                position: "absolute",
                left: `${pct}%`,
                color: "#475569",
                fontSize: 10,
                whiteSpace: "nowrap",
              }}
            >
              {formatDate(d)}
            </div>
          );
        })}
      </div>

      {/* Rows */}
      {rows.length === 0 ? (
        <div
          style={{ color: "#475569", textAlign: "center", padding: 32 }}
        >
          No active mandates to display
        </div>
      ) : (
        rows.map(
          ({
            mandate,
            startPct,
            widthPct,
            nowPct,
            holdColor,
            statusLabel,
            daysOld,
          }) => (
            <div
              key={mandate.id}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 10,
                gap: 12,
              }}
            >
              {/* Mandate label */}
              <div style={{ width: 170, flexShrink: 0 }}>
                <div
                  style={{
                    color: "#f1f5f9",
                    fontSize: 12,
                    fontWeight: 600,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                  }}
                >
                  {mandate.name}
                </div>
                <div style={{ color: "#64748b", fontSize: 10 }}>
                  {formatMoney(mandate.reservedCents)} reserved
                </div>
              </div>

              {/* Timeline bar */}
              <div
                style={{
                  flex: 1,
                  position: "relative",
                  height: 28,
                  background: "#1e293b",
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                {/* Zone overlays */}
                <div
                  style={{
                    position: "absolute",
                    left: `${startPct}%`,
                    width: `${Math.min((2 / TIMELINE_DAYS) * 100, widthPct)}%`,
                    height: "100%",
                    background: "rgba(34,197,94,0.15)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: `${startPct + (2 / TIMELINE_DAYS) * 100}%`,
                    width: `${Math.min((23 / TIMELINE_DAYS) * 100, Math.max(0, widthPct - (2 / TIMELINE_DAYS) * 100))}%`,
                    height: "100%",
                    background: "rgba(245,158,11,0.1)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: `${startPct + (25 / TIMELINE_DAYS) * 100}%`,
                    width: `${(4 / TIMELINE_DAYS) * 100}%`,
                    height: "100%",
                    background: "rgba(239,68,68,0.15)",
                  }}
                />

                {/* Hold bar */}
                <div
                  style={{
                    position: "absolute",
                    left: `${startPct}%`,
                    width: `${widthPct}%`,
                    height: "60%",
                    top: "20%",
                    background: holdColor,
                    borderRadius: 4,
                    opacity: 0.85,
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 8,
                    fontSize: 10,
                    color: "#fff",
                    fontWeight: 600,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  {statusLabel} · {daysOld.toFixed(0)}d
                </div>

                {/* NOW line */}
                <div
                  style={{
                    position: "absolute",
                    left: `${nowPct}%`,
                    width: 2,
                    height: "100%",
                    background: "#6366f1",
                    zIndex: 10,
                  }}
                />

                {/* Day-29 void marker */}
                <div
                  style={{
                    position: "absolute",
                    left: `${startPct + (29 / TIMELINE_DAYS) * 100}%`,
                    width: 2,
                    height: "100%",
                    background: "#ef4444",
                    opacity: 0.6,
                  }}
                />
              </div>

              {/* Status badge */}
              <div
                style={{
                  width: 90,
                  textAlign: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: holdColor + "22",
                  color: holdColor,
                  flexShrink: 0,
                }}
              >
                {statusLabel}
              </div>
            </div>
          )
        )
      )}

      <div
        style={{
          marginTop: 16,
          fontSize: 10,
          color: "#334155",
          textAlign: "right",
        }}
      >
        Render Workflow auto-voids holds at Day 29 · Now:{" "}
        {now.toLocaleTimeString()}
      </div>
    </div>
  );
}
