"use client";

import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { useMemo, useRef, useCallback } from "react";
import type { ColDef, GridReadyEvent, ICellRendererParams } from "ag-grid-community";
import { LicenseManager } from "ag-grid-enterprise";
import { formatDistanceToNow } from "date-fns";

// Set AG Grid Enterprise license key from environment
if (process.env["NEXT_PUBLIC_AG_GRID_LICENSE"]) {
  LicenseManager.setLicenseKey(process.env["NEXT_PUBLIC_AG_GRID_LICENSE"]);
}

interface LedgerRow {
  sequence: number;
  entryType: string;
  entityType: string;
  entityId: string;
  actorId: string;
  actorType: string;
  entryHash: string;
  previousHash: string;
  createdAt: string;
}

interface LedgerGridProps {
  rows: LedgerRow[];
  chainValid: boolean;
}

function StatusCellRenderer({ value }: ICellRendererParams) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    DECISION_MADE: { bg: "#e0f2fe", text: "#0369a1" },
    PAYMENT_AUTHORIZED: { bg: "#dcfce7", text: "#15803d" },
    PAYMENT_CAPTURED: { bg: "#ede9fe", text: "#6d28d9" },
    PAYMENT_VOIDED: { bg: "#fee2e2", text: "#b91c1c" },
    ESCALATION_CREATED: { bg: "#fef3c7", text: "#b45309" },
    ESCALATION_RESOLVED: { bg: "#d1fae5", text: "#047857" },
    MANDATE_REVOKED: { bg: "#fee2e2", text: "#b91c1c" },
    KILL_SWITCH_ACTIVATED: { bg: "#fecaca", text: "#991b1b" },
    REQUEST_RECEIVED: { bg: "#f1f5f9", text: "#334155" },
  };
  const color = colorMap[value as string] ?? { bg: "#f1f5f9", text: "#334155" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        borderRadius: "var(--radius-pill)",
        fontSize: "11px",
        fontWeight: 800,
        background: color.bg,
        color: color.text,
        border: "1px solid #121212",
        boxShadow: "1px 1px 0px #121212",
      }}
    >
      {value}
    </span>
  );
}

function HashCellRenderer({ value }: ICellRendererParams) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        fontWeight: 600,
        color: "#4b5563",
        background: "#f8faf5",
        padding: "2px 6px",
        borderRadius: "4px",
        border: "1px solid #e2e8f0",
      }}
      title={value as string}
    >
      {String(value).slice(0, 12)}…
    </span>
  );
}

function TimeCellRenderer({ value }: ICellRendererParams) {
  return (
    <span style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>
      {formatDistanceToNow(new Date(value as string), { addSuffix: true })}
    </span>
  );
}

export function LedgerGrid({ rows, chainValid }: LedgerGridProps) {
  const gridRef = useRef<AgGridReact<LedgerRow>>(null);

  const columnDefs: ColDef<LedgerRow>[] = useMemo(
    () => [
      {
        field: "sequence",
        headerName: "#",
        width: 70,
        pinned: "left",
        cellStyle: { fontWeight: "bold", color: "#121212", fontVariantNumeric: "tabular-nums" },
      },
      {
        field: "entryType",
        headerName: "Event",
        width: 220,
        cellRenderer: StatusCellRenderer,
      },
      {
        field: "actorType",
        headerName: "Actor",
        width: 90,
        cellStyle: { fontWeight: 600, color: "#121212", fontSize: "12px" },
      },
      {
        field: "actorId",
        headerName: "Actor ID",
        width: 140,
        cellRenderer: HashCellRenderer,
      },
      {
        field: "entityType",
        headerName: "Entity",
        width: 130,
        cellStyle: { fontWeight: 600, color: "#121212", fontSize: "12px" },
      },
      {
        field: "entityId",
        headerName: "Entity ID",
        width: 140,
        cellRenderer: HashCellRenderer,
      },
      {
        field: "entryHash",
        headerName: "Entry Hash",
        width: 140,
        cellRenderer: HashCellRenderer,
      },
      {
        field: "previousHash",
        headerName: "Prev Hash",
        width: 140,
        cellRenderer: HashCellRenderer,
      },
      {
        field: "createdAt",
        headerName: "Time",
        width: 150,
        cellRenderer: TimeCellRenderer,
        sort: "desc",
      },
    ],
    []
  );

  const defaultColDef: ColDef = useMemo(
    () => ({
      resizable: true,
      sortable: true,
      suppressMovable: false,
    }),
    []
  );

  const onGridReady = useCallback((e: GridReadyEvent) => {
    e.api.sizeColumnsToFit();
  }, []);

  return (
    <div className="card" style={{ overflow: "hidden", padding: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "var(--border-thick)",
          padding: "16px 22px",
          background: "#ffffff",
        }}
      >
        <div>
          <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#121212" }}>
            APPEND-ONLY LEDGER ENTRIES
          </h3>
          <p style={{ fontSize: "12px", fontWeight: 500, color: "#6b7280", marginTop: "2px" }}>
            SHA-256 hash-chained — tamper-evident audit records
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: chainValid ? "var(--neo-green-light)" : "#fee2e2",
            border: "1.5px solid #121212",
            borderRadius: "var(--radius-pill)",
            padding: "4px 12px",
            fontSize: "11px",
            fontWeight: 800,
            color: chainValid ? "#064e3b" : "#991b1b",
          }}
        >
          <span
            style={{
              height: "7px",
              width: "7px",
              borderRadius: "50%",
              background: chainValid ? "#059669" : "#dc2626",
            }}
          />
          {chainValid ? "Chain intact" : "Chain broken — investigate"}
        </div>
      </div>
      <div
        className="ag-theme-alpine"
        style={{ height: 480, width: "100%", border: "none" }}
      >
        <AgGridReact
          ref={gridRef}
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          rowHeight={44}
          headerHeight={44}
          animateRows={true}
          suppressCellFocus={true}
          enableCellTextSelection={true}
        />
      </div>
    </div>
  );
}
