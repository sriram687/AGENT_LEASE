import { db } from "@leash/db";
import { ledgerEntries, mandates } from "@leash/db";
import { eq, desc, asc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export interface SpendTimelinePoint {
  date: string;
  spentCents: number;
  reservedCents: number;
}

export async function getSpendTimeline(): Promise<SpendTimelinePoint[]> {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? "f7bb4da9-d8e6-4ec1-9065-5d9d9c1ae777";

    const [mandate] = await db
      .select({ id: mandates.id })
      .from(mandates)
      .where(eq(mandates.ownerId, userId))
      .limit(1);

    const [anyMandate] = !mandate
      ? await db.select({ id: mandates.id }).from(mandates).limit(1)
      : [null];

    const targetMandateId = mandate?.id ?? anyMandate?.id;
    if (!targetMandateId) return [];

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
      WHERE mandate_id = ${targetMandateId}
        AND entry_type IN ('PAYMENT_CAPTURED', 'PAYMENT_AUTHORIZED', 'PAYMENT_VOIDED')
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC
      LIMIT 90
    `);

    return (rows as unknown as Array<{ date: Date; spent_cents: string; reserved_cents: string }>).map(
      (row) => ({
        date: row.date.toISOString(),
        spentCents: Number(row.spent_cents),
        reservedCents: Number(row.reserved_cents),
      })
    );
  } catch (error) {
    console.error("[getSpendTimeline] Error fetching spend timeline:", error);
    return [];
  }
}

export async function getLedgerEntries(mandateId?: string) {
  let query = db.select().from(ledgerEntries);
  if (mandateId) {
    query = (query as any).where(eq(ledgerEntries.mandateId, mandateId));
  }
  return query.orderBy(asc(ledgerEntries.sequence)).limit(500);
}
