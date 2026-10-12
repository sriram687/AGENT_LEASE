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
  const colorMap: Record<string, string> = {
    DECISION_MADE: "#60a5fa",
    PAYMENT_AUTHORIZED: "#22c55e",
    PAYMENT_CAPTURED: "#8b5cf6",
    PAYMENT_VOIDED: "#ef4444",
    ESCALATION_CREATED: "#f59e0b",
    ESCALATION_RESOLVED: "#34d399",
    MANDATE_REVOKED: "#ef4444",
    KILL_SWITCH_ACTIVATED: "#ef4444",
    REQUEST_RECEIVED: "#94a3b8",
  };
  const color = colorMap[value as string] ?? "#94a3b8";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: `${color}18`, color }}
    >
      {value}
    </span>
  );
}

function HashCellRenderer({ value }: ICellRendererParams) {
  return (
    <span
      className="font-mono text-xs"
      style={{ color: "var(--color-text-muted)" }}
      title={value as string}
    >
      {String(value).slice(0, 12)}…
    </span>
  );
}

function TimeCellRenderer({ value }: ICellRendererParams) {
  return (
    <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
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
        cellStyle: { color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums" },
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
        cellStyle: { color: "var(--color-text-secondary)", fontSize: "12px" },
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
        cellStyle: { color: "var(--color-text-secondary)", fontSize: "12px" },
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
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--color-border)" }}>
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Append-Only Ledger</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            SHA-256 hash-chained — every entry is tamper-evident
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${chainValid ? "chain-valid" : "chain-broken"}`}
            style={{ background: chainValid ? "var(--color-approved)" : "var(--color-denied)" }}
          />
          <span
            className={`text-xs font-medium ${chainValid ? "chain-valid" : "chain-broken"}`}
          >
            {chainValid ? "Chain intact" : "Chain broken — investigate"}
          </span>
        </div>
      </div>
      <div
        className="ag-theme-alpine-dark"
        style={{ height: 480, width: "100%" }}
      >
        <AgGridReact
          ref={gridRef}
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          rowHeight={40}
          headerHeight={40}
          animateRows={true}
          suppressCellFocus={true}
          enableCellTextSelection={true}
        />
      </div>
    </div>
  );
}
