import { LedgerGrid } from "@/components/ledger/LedgerGrid";
import { getLedgerEntries } from "@/lib/api/ledger";
import { verifyChain } from "@leash/crypto";
import { db } from "@leash/db";
import { mandates } from "@leash/db";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { Check, ShieldAlert } from "lucide-react";

export const metadata = { title: "Ledger — Agent Leash" };
export const dynamic = "force-dynamic";

export default async function LedgerPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [mandate] = userId
    ? await db
        .select({ id: mandates.id })
        .from(mandates)
        .where(eq(mandates.ownerId, userId))
        .limit(1)
    : [null];

  const entries = mandate ? await getLedgerEntries(mandate.id) : [];

  // Verify chain integrity server-side
  const chainResult = verifyChain(
    entries.map((e) => ({
      previousHash: e.previousHash,
      entryHash: e.entryHash,
      payload: e.payload,
    }))
  );

  const rows = entries.map((e) => ({
    sequence: e.sequence,
    entryType: e.entryType,
    entityType: e.entityType,
    entityId: e.entityId,
    actorId: e.actorId,
    actorType: e.actorType,
    entryHash: e.entryHash,
    previousHash: e.previousHash,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="animate-fade-in">
      {/* Header Banner */}
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
          padding: "20px 24px",
          boxShadow: "var(--shadow-base)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 900, color: "#121212", letterSpacing: "-0.02em" }}>
              AUDIT LEDGER
            </h1>
            <span
              style={{
                background: "var(--neo-green-light)",
                border: "1.5px solid #121212",
                padding: "2px 10px",
                borderRadius: "var(--radius-pill)",
                fontSize: "11px",
                fontWeight: 800,
                boxShadow: "1.5px 1.5px 0px #121212",
                color: "#064e3b",
              }}
            >
              IMMUTABLE
            </span>
          </div>
          <p style={{ fontSize: "13px", fontWeight: 500, color: "#4b5563", marginTop: "4px" }}>
            Append-only, SHA-256 hash-chained record of every gateway action. Integrity verified server-side.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: chainResult.valid ? "var(--neo-green-light)" : "#fee2e2",
            border: "var(--border-medium)",
            borderRadius: "var(--radius-pill)",
            padding: "8px 16px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {chainResult.valid ? <Check size={16} strokeWidth={3} color="#064e3b" /> : <ShieldAlert size={16} strokeWidth={2.5} color="#991b1b" />}
          <span style={{ fontSize: "12px", fontWeight: 800, color: chainResult.valid ? "#064e3b" : "#991b1b" }}>
            {chainResult.valid ? "CHAIN VERIFIED" : "TAMPER DETECTED"}
          </span>
        </div>
      </div>

      <LedgerGrid rows={rows} chainValid={chainResult.valid} />

      {!chainResult.valid && (
        <div
          style={{
            background: "#fee2e2",
            border: "var(--border-thick)",
            borderRadius: "var(--radius-md)",
            padding: "16px",
            boxShadow: "var(--shadow-base)",
          }}
        >
          <p style={{ fontSize: "13px", fontWeight: 800, color: "#991b1b" }}>
            ⚠️ Chain integrity failure detected at entry <strong>#{chainResult.brokenAtIndex}</strong>.
            This may indicate unauthorized modification. Contact your security team immediately.
          </p>
        </div>
      )}
    </div>
  );
}
