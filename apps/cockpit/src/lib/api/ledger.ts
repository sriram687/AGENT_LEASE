import { db } from "@leash/db";
import { ledgerEntries, mandates } from "@leash/db";
import { eq, desc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export interface SpendTimelinePoint {
  date: string;
  spentCents: number;
  reservedCents: number;
}

export async function getSpendTimeline(): Promise<SpendTimelinePoint[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const [mandate] = await db
    .select({ id: mandates.id })
    .from(mandates)
    .where(eq(mandates.ownerId, session.user.id))
    .limit(1);

  if (!mandate) return [];

  // Daily aggregation of spend from ledger capture events
  const rows = await db.execute(sql`
    SELECT
      DATE_TRUNC('day', created_at) AS date,
      SUM(
        CASE WHEN entry_type = 'PAYMENT_CAPTURED'
             THEN (payload->>'amountCents')::int ELSE 0 END
      ) AS spent_cents,
      SUM(
        CASE WHEN entry_type = 'PAYMENT_AUTHORIZED'
             THEN (payload->>'amountCents')::int ELSE 0 END
      ) AS reserved_cents
    FROM ledger_entries
    WHERE mandate_id = ${mandate.id}
      AND entry_type IN ('PAYMENT_CAPTURED', 'PAYMENT_AUTHORIZED', 'PAYMENT_VOIDED')
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY date ASC
    LIMIT 90
  `);

  return (rows.rows as Array<{ date: Date; spent_cents: string; reserved_cents: string }>).map(
    (row) => ({
      date: row.date.toISOString(),
      spentCents: Number(row.spent_cents),
      reservedCents: Number(row.reserved_cents),
    })
  );
}

export async function getLedgerEntries(mandateId: string) {
  return db
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.mandateId, mandateId))
    .orderBy(desc(ledgerEntries.sequence))
    .limit(500);
}
