import { NextResponse } from "next/server";
import { db, purchaseRequests } from "@leash/db";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db
      .select({
        id: purchaseRequests.id,
        item: purchaseRequests.itemName,
        amountCents: purchaseRequests.amountCents,
        status: purchaseRequests.status,
        timestamp: purchaseRequests.requestedAt,
        justification: purchaseRequests.justification,
      })
      .from(purchaseRequests)
      .orderBy(desc(purchaseRequests.requestedAt))
      .limit(10);

    const formatted = rows.map((r) => {
      let type: "APPROVE" | "DENY" | "ESCALATE" = "APPROVE";
      if (r.status === "REJECTED") type = "DENY";
      else if (r.status === "ESCALATED") type = "ESCALATE";

      return {
        id: r.id,
        type,
        item: r.item,
        amountCents: r.amountCents,
        timestamp: r.timestamp.toISOString(),
        justification: r.justification ?? undefined,
      };
    });

    return NextResponse.json(formatted);
  } catch (err: any) {
    console.error("[api/recent-activity] Error:", err);
    return NextResponse.json([]);
  }
}
