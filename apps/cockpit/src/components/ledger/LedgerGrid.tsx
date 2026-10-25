"use client";

import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { useMemo, useRef, useCallback, useState } from "react";
import type { ColDef, GridReadyEvent, ICellRendererParams, RowClickedEvent } from "ag-grid-community";
import { LicenseManager } from "ag-grid-enterprise";
import { formatDistanceToNow } from "date-fns";
import {
  ShieldCheck,
  ShieldAlert,
  Download,
  RefreshCw,
  Eye,
  X,
  ExternalLink,
  CheckCircle2,
  Copy,
  Hash,
} from "lucide-react";
import toast from "react-hot-toast";
import { syncLedgerFromDatabase } from "@/lib/actions/ledger";

// Set AG Grid Enterprise license key from environment
if (process.env["NEXT_PUBLIC_AG_GRID_LICENSE"]) {
  LicenseManager.setLicenseKey(process.env["NEXT_PUBLIC_AG_GRID_LICENSE"]);
}

export interface LedgerRow {
  sequence: number;
  entryType: string;
  entityType: string;
  entityId: string;
  actorId: string;
  actorType: string;
  entryHash: string;
  previousHash: string;
  payload?: any;
  createdAt: string;
}

interface LedgerGridProps {
  rows: LedgerRow[];
  chainValid: boolean;
}

function StatusCellRenderer({ value }: ICellRendererParams) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    MANDATE_CREATED: { bg: "#e0f2fe", text: "#0369a1", border: "#7dd3fc" },
    MANDATE_UPDATED: { bg: "#fef3c7", text: "#b45309", border: "#fde68a" },
    MANDATE_REVOKED: { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" },
    REQUEST_RECEIVED: { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1" },
    DECISION_MADE: { bg: "#e0f2fe", text: "#0369a1", border: "#7dd3fc" },
    PAYMENT_AUTHORIZED: { bg: "#dcfce7", text: "#15803d", border: "#86efac" },
    PAYMENT_CAPTURED: { bg: "#ede9fe", text: "#6d28d9", border: "#c4b5fd" },
    PAYMENT_VOIDED: { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" },
    ESCALATION_CREATED: { bg: "#fef3c7", text: "#b45309", border: "#fde68a" },
    ESCALATION_RESOLVED: { bg: "#d1fae5", text: "#047857", border: "#6ee7b7" },
    KILL_SWITCH_ACTIVATED: { bg: "#fecaca", text: "#991b1b", border: "#f87171" },
  };
  const color = colorMap[value as string] ?? { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1" };
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
        border: "1.5px solid #121212",
        boxShadow: "1px 1px 0px #121212",
      }}
    >
      {value}
    </span>
  );
}

function HashCellRenderer({ value }: ICellRendererParams) {
  const str = String(value || "");
  const isGenesis = str.startsWith("00000000");
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        fontWeight: 600,
        color: isGenesis ? "#059669" : "#4b5563",
        background: isGenesis ? "#ecfdf5" : "#f8faf5",
        padding: "2px 6px",
        borderRadius: "4px",
        border: "1px solid #e2e8f0",
      }}
      title={str}
    >
      {isGenesis ? "GENESIS [0x0]" : `${str.slice(0, 10)}…${str.slice(-4)}`}
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
  const [selectedBlock, setSelectedBlock] = useState<LedgerRow | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const columnDefs: ColDef<LedgerRow>[] = useMemo(
    () => [
      {
        field: "sequence",
        headerName: "#",
        width: 80,
        pinned: "left",
        cellStyle: { fontWeight: "900", color: "#121212", fontVariantNumeric: "tabular-nums" },
        sort: "desc",
      },
      {
        field: "entryType",
        headerName: "Audit Event",
        width: 220,
        cellRenderer: StatusCellRenderer,
      },
      {
        field: "actorType",
        headerName: "Actor",
        width: 100,
        cellStyle: { fontWeight: 700, color: "#121212", fontSize: "12px", textTransform: "uppercase" },
      },
      {
        field: "entityType",
        headerName: "Entity Type",
        width: 130,
        cellStyle: { fontWeight: 600, color: "#374151", fontSize: "12px" },
      },
      {
        field: "entityId",
        headerName: "Entity ID",
        width: 150,
        cellRenderer: HashCellRenderer,
      },
      {
        field: "entryHash",
        headerName: "Entry Hash (SHA-256)",
        width: 160,
        cellRenderer: HashCellRenderer,
      },
      {
        field: "previousHash",
        headerName: "Prev Hash",
        width: 150,
        cellRenderer: HashCellRenderer,
      },
      {
        field: "createdAt",
        headerName: "Timestamp",
        width: 140,
        cellRenderer: TimeCellRenderer,
      },
      {
        headerName: "Inspect",
        width: 90,
        cellRenderer: () => (
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              background: "#ffffff",
              border: "1.5px solid #121212",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "1px 1px 0px #121212",
            }}
          >
            <Eye size={12} /> View
          </button>
        ),
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

  const onRowClicked = (e: RowClickedEvent<LedgerRow>) => {
    if (e.data) {
      setSelectedBlock(e.data);
    }
  };

  const handleExportCSV = () => {
    if (rows.length === 0) {
      toast.error("Ledger is empty, nothing to export.");
      return;
    }
    const headers = ["sequence", "entryType", "actorType", "actorId", "entityType", "entityId", "entryHash", "previousHash", "createdAt"];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r: any) => headers.map((h) => `"${r[h] ?? ""}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agent_leash_ledger_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Cryptographic Audit Ledger exported to CSV!");
  };

  const handleExportJSON = () => {
    if (rows.length === 0) {
      toast.error("Ledger is empty, nothing to export.");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rows, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `agent_leash_ledger_proof_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Ledger proof exported as JSON!");
  };

  const handleSyncFromDB = async () => {
    setIsSyncing(true);
    try {
      const res = await syncLedgerFromDatabase();
      if (res.success) {
        toast.success(`Ledger synced! Total blocks chained: ${res.syncedBlocks}`);
      } else {
        toast.error(`Sync error: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sync ledger");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <div className="card" style={{ overflow: "hidden", padding: 0 }}>
        {/* Card Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            borderBottom: "var(--border-thick)",
            padding: "16px 22px",
            background: "#ffffff",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 900, color: "#121212", letterSpacing: "-0.01em" }}>
                APPEND-ONLY LEDGER ENTRIES ({rows.length})
              </h3>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: chainValid ? "var(--neo-green-light)" : "#fee2e2",
                  border: "1.5px solid #121212",
                  borderRadius: "var(--radius-pill)",
                  padding: "3px 10px",
                  fontSize: "11px",
                  fontWeight: 800,
                  color: chainValid ? "#064e3b" : "#991b1b",
                  boxShadow: "1px 1px 0px #121212",
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
                {chainValid ? "SHA-256 Chain Intact" : "Chain Integrity Broken"}
              </div>
            </div>
            <p style={{ fontSize: "12px", fontWeight: 500, color: "#6b7280", marginTop: "2px" }}>
              Every mandate change, policy evaluation, and PayPal 2PC transaction is cryptographically linked.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={() => setShowVerifyModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "var(--neo-yellow)",
                color: "#121212",
                border: "var(--border-thick)",
                borderRadius: "var(--radius-md)",
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <ShieldCheck size={15} strokeWidth={2.5} />
              Verify Chain Proof
            </button>

            <button
              onClick={handleSyncFromDB}
              disabled={isSyncing}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#ffffff",
                color: "#121212",
                border: "var(--border-thick)",
                borderRadius: "var(--radius-md)",
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: 800,
                cursor: isSyncing ? "wait" : "pointer",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
              {isSyncing ? "Syncing..." : "Replay / Sync"}
            </button>

            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={handleExportCSV}
                title="Export CSV"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "#f8fafc",
                  color: "#121212",
                  border: "1.5px solid #121212",
                  borderRadius: "var(--radius-md)",
                  padding: "8px 12px",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <Download size={14} /> CSV
              </button>
              <button
                onClick={handleExportJSON}
                title="Export JSON"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "#f8fafc",
                  color: "#121212",
                  border: "1.5px solid #121212",
                  borderRadius: "var(--radius-md)",
                  padding: "8px 12px",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                JSON
              </button>
            </div>
          </div>
        </div>

        {/* AG Grid */}
        <div className="ag-theme-alpine" style={{ height: 520, width: "100%", border: "none" }}>
          <AgGridReact
            ref={gridRef}
            rowData={rows}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            onGridReady={onGridReady}
            onRowClicked={onRowClicked}
            rowHeight={46}
            headerHeight={46}
            animateRows={true}
            suppressCellFocus={true}
            enableCellTextSelection={true}
          />
        </div>
      </div>

      {/* Block Inspector Modal / Drawer */}
      {selectedBlock && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(18, 18, 18, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setSelectedBlock(null)}
        >
          <div
            style={{
              background: "#ffffff",
              border: "var(--border-thick)",
              borderRadius: "var(--radius-lg)",
              maxWidth: "680px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "8px 8px 0px #121212",
              padding: "24px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "var(--border-thick)",
                paddingBottom: "16px",
                marginBottom: "20px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      background: "var(--neo-yellow)",
                      border: "1.5px solid #121212",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: 900,
                    }}
                  >
                    BLOCK #{selectedBlock.sequence}
                  </span>
                  <StatusCellRenderer value={selectedBlock.entryType} {...({} as any)} />
                </div>
                <h2 style={{ fontSize: "18px", fontWeight: 900, color: "#121212", marginTop: "6px" }}>
                  Cryptographic Block Inspector
                </h2>
              </div>
              <button
                onClick={() => setSelectedBlock(null)}
                style={{
                  background: "#f3f4f6",
                  border: "1.5px solid #121212",
                  borderRadius: "6px",
                  padding: "6px",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Block Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div
                style={{
                  background: "#f8fafc",
                  border: "1.5px solid #121212",
                  borderRadius: "var(--radius-md)",
                  padding: "14px",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                  SHA-256 Entry Hash
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#0f172a",
                    wordBreak: "break-all",
                    marginTop: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <span>{selectedBlock.entryHash}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedBlock.entryHash);
                      toast.success("Hash copied!");
                    }}
                    style={{
                      border: "1px solid #121212",
                      borderRadius: "4px",
                      background: "#ffffff",
                      padding: "3px 6px",
                      cursor: "pointer",
                    }}
                    title="Copy Hash"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  border: "1.5px solid #121212",
                  borderRadius: "var(--radius-md)",
                  padding: "14px",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                  Previous Block Hash
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: selectedBlock.previousHash.startsWith("00000000") ? "#059669" : "#0f172a",
                    wordBreak: "break-all",
                    marginTop: "4px",
                  }}
                >
                  {selectedBlock.previousHash}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div
                  style={{
                    border: "1.5px solid #121212",
                    borderRadius: "var(--radius-md)",
                    padding: "12px",
                    background: "#ffffff",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#64748b" }}>ACTOR</div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#121212", marginTop: "2px" }}>
                    {selectedBlock.actorType.toUpperCase()} ({selectedBlock.actorId.slice(0, 12)})
                  </div>
                </div>

                <div
                  style={{
                    border: "1.5px solid #121212",
                    borderRadius: "var(--radius-md)",
                    padding: "12px",
                    background: "#ffffff",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#64748b" }}>ENTITY</div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#121212", marginTop: "2px" }}>
                    {selectedBlock.entityType} ({selectedBlock.entityId.slice(0, 12)})
                  </div>
                </div>
              </div>

              {/* Canonical Payload */}
              <div>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#121212", marginBottom: "6px" }}>
                  CANONICAL AUDIT PAYLOAD (JSON)
                </div>
                <pre
                  style={{
                    background: "#1e1e1e",
                    color: "#a7f3d0",
                    border: "1.5px solid #121212",
                    borderRadius: "var(--radius-md)",
                    padding: "14px",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono)",
                    overflowX: "auto",
                    maxHeight: "220px",
                  }}
                >
                  {JSON.stringify(selectedBlock.payload ?? {}, null, 2)}
                </pre>
              </div>
            </div>

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setSelectedBlock(null)}
                style={{
                  background: "#121212",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  padding: "8px 18px",
                  fontWeight: 800,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Chain Modal */}
      {showVerifyModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(18, 18, 18, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setShowVerifyModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              border: "var(--border-thick)",
              borderRadius: "var(--radius-lg)",
              maxWidth: "640px",
              width: "100%",
              boxShadow: "8px 8px 0px #121212",
              padding: "28px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    height: "44px",
                    width: "44px",
                    borderRadius: "50%",
                    background: chainValid ? "var(--neo-green-light)" : "#fee2e2",
                    border: "2px solid #121212",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "2px 2px 0px #121212",
                  }}
                >
                  {chainValid ? <CheckCircle2 size={24} color="#064e3b" /> : <ShieldAlert size={24} color="#991b1b" />}
                </div>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 900, color: "#121212" }}>
                    Cryptographic Integrity Verification
                  </h2>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280" }}>
                    SHA-256 Recursive Mathematical Proof
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVerifyModal(false)}
                style={{
                  background: "#f3f4f6",
                  border: "1.5px solid #121212",
                  borderRadius: "6px",
                  padding: "6px",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div
                style={{
                  background: chainValid ? "#ecfdf5" : "#fef2f2",
                  border: "1.5px solid #121212",
                  borderRadius: "var(--radius-md)",
                  padding: "16px",
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: 900, color: chainValid ? "#064e3b" : "#991b1b" }}>
                  {chainValid
                    ? `✓ 100% Cryptographically Valid across all ${rows.length} blocks`
                    : "⚠️ Chain verification failed: unauthorized modification detected"}
                </div>
                <p style={{ fontSize: "12px", fontWeight: 500, color: "#374151", marginTop: "4px" }}>
                  Every block strictly satisfies:{" "}
                  <code style={{ background: "#ffffff", padding: "1px 6px", borderRadius: "3px", border: "1px solid #cbd5e1" }}>
                    Hash_n = SHA-256(Hash_(n-1) || canonical(Payload_n))
                  </code>
                </p>
              </div>

              <div style={{ border: "1.5px solid #121212", borderRadius: "var(--radius-md)", padding: "14px", background: "#f8fafc" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#64748b" }}>GENESIS BLOCK HASH</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, color: "#059669", marginTop: "2px" }}>
                  0000000000000000000000000000000000000000000000000000000000000000
                </div>
              </div>

              <div style={{ border: "1.5px solid #121212", borderRadius: "var(--radius-md)", padding: "14px", background: "#f8fafc" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#64748b" }}>LATEST TIP HASH (#{rows[0]?.sequence ?? 0})</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, color: "#1e293b", marginTop: "2px", wordBreak: "break-all" }}>
                  {rows[0]?.entryHash ?? "N/A (Chain empty)"}
                </div>
              </div>

              <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.5 }}>
                Because the hash chain is immutable and validated against the gateway&apos;s Ed25519 signing key, no database admin or agent can alter historical payments without breaking the entire chain.
              </div>
            </div>

            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowVerifyModal(false)}
                style={{
                  background: "var(--neo-green)",
                  color: "#121212",
                  border: "var(--border-thick)",
                  borderRadius: "var(--radius-md)",
                  padding: "8px 20px",
                  fontWeight: 900,
                  fontSize: "13px",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                Verification Acknowledged
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
