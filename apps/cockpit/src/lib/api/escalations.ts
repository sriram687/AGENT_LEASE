import { db } from "@leash/db";
import { escalations, purchaseRequests, mandates } from "@leash/db";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function getPendingEscalations() {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];

    const rows = await db
      .select({
        id: escalations.id,
        purchaseRequestId: escalations.purchaseRequestId,
        status: escalations.status,
        leashReasoning: escalations.leashReasoning,
        expiresAt: escalations.expiresAt,
        createdAt: escalations.createdAt,
      })
      .from(escalations)
      .innerJoin(purchaseRequests, eq(escalations.purchaseRequestId, purchaseRequests.id))
      .innerJoin(mandates, eq(purchaseRequests.mandateId, mandates.id))
      .where(
        and(
          eq(mandates.ownerId, session.user.id),
          eq(escalations.status, "PENDING")
        )
      );

    return rows;
  } catch (error) {
    console.error("[getPendingEscalations] Error fetching escalations:", error);
    return [];
  }
}
