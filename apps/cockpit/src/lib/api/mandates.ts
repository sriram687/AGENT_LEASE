import { db } from "@leash/db";
import { mandates } from "@leash/db";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function getMandateSummary() {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? "f7bb4da9-d8e6-4ec1-9065-5d9d9c1ae777";

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
      .where(eq(mandates.ownerId, userId))
      .limit(1);

    // If still null, return any active mandate
    if (!mandate) {
      const [fallback] = await db.select().from(mandates).limit(1);
      return fallback ?? null;
    }

    return mandate ?? null;
  } catch (error) {
    console.error("[getMandateSummary] Error fetching mandate summary:", error);
    return null;
  }
}
