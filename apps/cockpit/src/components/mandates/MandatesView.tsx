"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  DollarSign,
  Lock,
  Layers,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { MandateWithAgent, getMandates } from "@/lib/actions/mandates";
import { MandateCard } from "./MandateCard";
import { CreateMandateModal } from "./CreateMandateModal";
import { MandateSimulatorModal } from "./MandateSimulatorModal";
import { SignatureInspectionModal } from "./SignatureInspectionModal";
import { useRouter } from "next/navigation";

interface MandatesViewProps {
  initialMandates: MandateWithAgent[];
}

export function MandatesView({ initialMandates }: MandatesViewProps) {
  const router = useRouter();
  const [mandates, setMandates] = useState<MandateWithAgent[]>(initialMandates);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "suspended" | "revoked">("all");

  // Keep state synced with server props
  useEffect(() => {
    setMandates(initialMandates);
  }, [initialMandates]);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [inspectMandate, setInspectMandate] = useState<MandateWithAgent | null>(null);
  const [simulateMandate, setSimulateMandate] = useState<MandateWithAgent | null>(null);

  // Aggregated metrics
  const totalAllocatedCents = mandates.reduce((acc, m) => acc + m.totalBudgetCents, 0);
  const totalSpentCents = mandates.reduce((acc, m) => acc + m.spentCents, 0);
  const totalReservedCents = mandates.reduce((acc, m) => acc + m.reservedCents, 0);
  const activeCount = mandates.filter((m) => m.status === "active").length;

  // Filtered mandates
  const filtered = mandates.filter((m) => {
    const matchesSearch =
      m.agentName.toLowerCase().includes(search.toLowerCase()) ||
      m.purpose.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || m.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCreated = (newMandate: MandateWithAgent) => {
    setMandates([newMandate, ...mandates]);
  };

  const handleUpdateMandate = async (updated?: Partial<MandateWithAgent> & { id: string }) => {
    // 1. Optimistic instant local update
    if (updated) {
      setMandates((prev) =>
        prev.map((m) => {
          if (m.id === updated.id) {
            const next = { ...m, ...updated };
            next.availableCents = Math.max(
              0,
              next.totalBudgetCents - next.spentCents - next.reservedCents
            );
            return next;
          }
          return m;
        })
      );
    }

    // 2. Fresh database fetch for 100% real parity
    const res = await getMandates();
    if (res.success && res.mandates) {
      setMandates(res.mandates);
    }
    router.refresh();
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        maxWidth: "1280px",
        margin: "0 auto",
      }}
      className="animate-fade-in"
    >
      {/* Top Banner */}
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
          padding: "22px 28px",
          boxShadow: "var(--shadow-base)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "var(--neo-purple)",
              border: "var(--border-thick)",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FileText size={26} color="#ffffff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h1
                style={{
                  fontSize: "24px",
                  fontWeight: 900,
                  color: "#121212",
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                MANDATES & POLICY GOVERNANCE
              </h1>
              <span
                style={{
                  background: "var(--neo-green)",
                  border: "1.5px solid #121212",
                  padding: "2px 10px",
                  borderRadius: "var(--radius-pill)",
                  fontSize: "11px",
                  fontWeight: 800,
                  boxShadow: "1.5px 1.5px 0px #121212",
                }}
              >
                PHASE 2 ACTIVE
              </span>
            </div>
            <p style={{ fontSize: "14px", color: "var(--color-ink-muted)", margin: "4px 0 0 0" }}>
              Define cryptographic spending policies, MCC category allowlists, and single-purchase caps for AI agents.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => setIsCreateOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "var(--radius-pill)",
              background: "var(--neo-yellow)",
              color: "#121212",
              border: "var(--border-thick)",
              boxShadow: "var(--shadow-base)",
              fontSize: "13.5px",
              fontWeight: 800,
              cursor: "pointer",
              transition: "transform 0.1s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translate(-1px, -1px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
          >
            <Plus size={18} strokeWidth={3} />
            <span>Create New Mandate</span>
          </button>
        </div>
      </div>

      {/* Aggregate Telemetry Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "var(--border-thick)",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            boxShadow: "var(--shadow-base)",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--color-ink-muted)", textTransform: "uppercase" }}>
            ACTIVE MANDATES
          </span>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#121212", marginTop: "2px" }}>
            {activeCount} <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 600 }}>/ {mandates.length} total</span>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "var(--border-thick)",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            boxShadow: "var(--shadow-base)",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--color-ink-muted)", textTransform: "uppercase" }}>
            TOTAL ALLOCATED BUDGET
          </span>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#121212", marginTop: "2px" }}>
            ${(totalAllocatedCents / 100).toFixed(2)}
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "var(--border-thick)",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            boxShadow: "var(--shadow-base)",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 800, color: "#059669", textTransform: "uppercase" }}>
            CAPTURED SPEND
          </span>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#059669", marginTop: "2px" }}>
            ${(totalSpentCents / 100).toFixed(2)}
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "var(--border-thick)",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            boxShadow: "var(--shadow-base)",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 800, color: "#0284c7", textTransform: "uppercase" }}>
            OPEN 2PC HOLDS (ESCROW)
          </span>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#0284c7", marginTop: "2px" }}>
            ${(totalReservedCents / 100).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          background: "#ffffff",
          border: "var(--border-thick)",
          borderRadius: "var(--radius-md)",
          padding: "12px 18px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "240px" }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Search mandates by agent, purpose, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              fontSize: "13px",
              fontWeight: 600,
              background: "transparent",
            }}
          />
        </div>

        {/* Status Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {(["all", "active", "suspended", "revoked"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              style={{
                padding: "5px 12px",
                borderRadius: "var(--radius-pill)",
                border: "1.5px solid #121212",
                background: filterStatus === st ? "#121212" : "#ffffff",
                color: filterStatus === st ? "#ffffff" : "#121212",
                fontSize: "11px",
                fontWeight: 800,
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Mandates Cards Grid */}
      {filtered.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "24px",
          }}
        >
          {filtered.map((mandate) => (
            <MandateCard
              key={mandate.id}
              mandate={mandate}
              onInspectSignature={(m) => setInspectMandate(m)}
              onSimulate={(m) => setSimulateMandate(m)}
              onStatusChanged={() => handleUpdateMandate()}
              onUpdated={handleUpdateMandate}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            background: "#ffffff",
            border: "var(--border-thick)",
            borderRadius: "var(--radius-lg)",
            padding: "48px 24px",
            textAlign: "center",
            boxShadow: "var(--shadow-base)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "var(--neo-yellow)",
              border: "var(--border-medium)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto",
            }}
          >
            <FileText size={26} color="#121212" />
          </div>
          <h3 style={{ fontSize: "18px", fontWeight: 900, color: "#121212", margin: 0 }}>
            No Mandates Found
          </h3>
          <p style={{ fontSize: "13px", color: "var(--color-ink-muted)", marginTop: "4px" }}>
            No agent spending mandates match your current search or filter criteria.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            style={{
              marginTop: "16px",
              padding: "8px 20px",
              background: "var(--neo-green)",
              border: "var(--border-medium)",
              borderRadius: "var(--radius-pill)",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Create Your First Mandate &rarr;
          </button>
        </div>
      )}

      {/* Modals */}
      <CreateMandateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />

      <SignatureInspectionModal
        mandate={inspectMandate}
        onClose={() => setInspectMandate(null)}
      />

      <MandateSimulatorModal
        mandate={simulateMandate}
        onClose={() => setSimulateMandate(null)}
        onUpdated={handleUpdateMandate}
      />
    </div>
  );
}
