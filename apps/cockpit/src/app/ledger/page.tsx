import { LedgerGrid } from "@/components/ledger/LedgerGrid";
import { getLedgerEntries } from "@/lib/api/ledger";
import { verifyChain } from "@leash/crypto";
import { db } from "@leash/db";
import { mandates } from "@leash/db";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export const metadata = { title: "Ledger — Agent Leash" };
export const dynamic = "force-dynamic";

export default async function LedgerPage() {
  const session = await auth();
  const [mandate] = await db
    .select({ id: mandates.id })
    .from(mandates)
    .where(eq(mandates.ownerId, session?.user?.id ?? ""))
    .limit(1);

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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-gray-50">Audit Ledger</h1>
        <p className="text-sm text-gray-400 mt-1">
          Append-only, SHA-256 hash-chained record of every action. Chain integrity verified
          server-side on every page load.
        </p>
      </div>

      <LedgerGrid rows={rows} chainValid={chainResult.valid} />

      {!chainResult.valid && (
        <div
          className="rounded-xl border p-4 text-sm"
          style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.3)", color: "#fca5a5" }}
        >
          ⚠️ Chain integrity failure detected at entry{" "}
          <strong>#{chainResult.brokenAtIndex}</strong>. This may indicate
          unauthorized data modification. Contact your security team immediately.
        </div>
      )}
    </div>
  );
}
