import { db } from "@leash/db";
import { mandates } from "@leash/db";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function getMandateSummary() {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;

    const [mandate] = await db
      .select({
        id: mandates.id,
        purpose: mandates.purpose,
        totalBudgetCents: mandates.totalBudgetCents,
        spentCents: mandates.spentCents,
        reservedCents: mandates.reservedCents,
        perPurchaseCapCents: mandates.perPurchaseCapCents,
        escalateAboveCents: mandates.escalateAboveCents,
        status: mandates.status,
        expiresAt: mandates.expiresAt,
        allowedCategories: mandates.allowedCategories,
        captureMode: mandates.captureMode,
      })
      .from(mandates)
      .where(eq(mandates.ownerId, session.user.id))
      .limit(1);

    return mandate ?? null;
  } catch (error) {
    console.error("[getMandateSummary] Error fetching mandate summary:", error);
    return null;
  }
}
