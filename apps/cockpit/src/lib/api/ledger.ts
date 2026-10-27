import { db } from "@leash/db";
import { ledgerEntries, mandates, paymentRecords } from "@leash/db";
import { eq, desc, asc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export interface SpendTimelinePoint {
  date: string;
  dateLabel: string;
  spentCents: number;
  reservedCents: number;
  dailySpentCents: number;
  dailyReservedCents: number;
}

/**
 * Returns a continuous, multi-day spend & hold timeline across all mandates.
 * Ensures at least 7 continuous days (e.g. Oct 21 to Oct 27) are always present
 * so the chart draws a rich, smooth curve even when events are sparse.
 */
export async function getSpendTimeline(mandateIdFilter?: string): Promise<SpendTimelinePoint[]> {
  try {
    // 1. Fetch all payment records to get exact source-of-truth amounts & timestamps
    let paymentQuery = db
      .select({
        id: paymentRecords.id,
        status: paymentRecords.status,
        amountCents: paymentRecords.amountCents,
        authorizedAt: paymentRecords.authorizedAt,
        capturedAt: paymentRecords.capturedAt,
        createdAt: paymentRecords.createdAt,
      })
      .from(paymentRecords);

    const allPayments = await paymentQuery;

    // 2. Fetch all mandates to know current aggregate spent & reserved
    const allMandates = await db.select().from(mandates);
    const totalCurrentSpentCents = allMandates.reduce((sum, m) => sum + m.spentCents, 0);
    const totalCurrentReservedCents = allMandates.reduce((sum, m) => sum + m.reservedCents, 0);

    // 3. Generate a 7-day continuous window ending today (or 14 days)
    const DAYS_COUNT = 7;
    const now = new Date();
    const days: Date[] = [];

    for (let i = DAYS_COUNT - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }

    // 4. Map daily events
    const dailyMap = new Map<string, { spentCents: number; reservedCents: number }>();
    for (const d of days) {
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, { spentCents: 0, reservedCents: 0 });
    }

    // Populate from payments
    for (const p of allPayments) {
      const pDate = p.capturedAt || p.authorizedAt || p.createdAt;
      if (!pDate) continue;

      const key = new Date(pDate).toISOString().slice(0, 10);
      const existing = dailyMap.get(key) || { spentCents: 0, reservedCents: 0 };

      if (p.status === "CAPTURED") {
        existing.spentCents += p.amountCents;
      } else if (p.status === "AUTHORIZED") {
        existing.reservedCents += p.amountCents;
      }
      dailyMap.set(key, existing);
    }

    // 5. Build cumulative & daily timeline points
    let runningSpent = 0;
    const result: SpendTimelinePoint[] = [];

    for (let i = 0; i < days.length; i++) {
      const d = days[i]!;
      const key = d.toISOString().slice(0, 10);
      const stats = dailyMap.get(key) || { spentCents: 0, reservedCents: 0 };

      runningSpent += stats.spentCents;

      // On the latest day (today), ensure active reserved holds match live database state
      const isToday = i === days.length - 1;
      const reservedForDay = isToday
        ? Math.max(stats.reservedCents, totalCurrentReservedCents)
        : stats.reservedCents;

      result.push({
        date: d.toISOString(),
        dateLabel: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        spentCents: runningSpent,
        reservedCents: reservedForDay,
        dailySpentCents: stats.spentCents,
        dailyReservedCents: stats.reservedCents,
      });
    }

    return result;
  } catch (error) {
    console.error("[getSpendTimeline] Error fetching spend timeline:", error);

    // Safe fallback with 7 continuous baseline points so chart never renders blank
    const fallback: SpendTimelinePoint[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      fallback.push({
        date: d.toISOString(),
        dateLabel: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        spentCents: 0,
        reservedCents: 0,
        dailySpentCents: 0,
        dailyReservedCents: 0,
      });
    }
    return fallback;
  }
}

export async function getLedgerEntries(mandateId?: string) {
  let query = db.select().from(ledgerEntries);
  if (mandateId) {
    query = (query as any).where(eq(ledgerEntries.mandateId, mandateId));
  }
  return query.orderBy(asc(ledgerEntries.sequence)).limit(500);
}
