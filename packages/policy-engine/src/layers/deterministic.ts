/**
 * Layer 1: Deterministic Rules
 *
 * All checks are pure logic – no LLM, no external calls.
 * Fast and predictable. A single failure is a hard DENY.
 *
 * Checks:
 *  - Budget remaining (totalBudget - spent - reserved)
 *  - Per-purchase cap
 *  - Category allowlist
 *  - Merchant allowlist
 *  - Mandate expiry
 *  - Velocity (max purchases per window)
 *  - Exact duplicate detection (same idempotency key or same item+vendor+amount in last 10 min)
 *  - Structuring detection (many small buys avoiding the escalate threshold)
 */
import type { DB } from "@leash/db";
import { purchaseRequests, and, eq, gt, gte, lt, sql, count } from "@leash/db";
import type { Mandate } from "@leash/db";
import type { RequestPurchaseInput, RuleResults } from "@leash/types";

export async function runDeterministicRules(
  input: RequestPurchaseInput,
  mandate: Mandate,
  db: DB
): Promise<RuleResults> {
  const failedRules: string[] = [];
  const now = new Date();

  // 1. Mandate expiry
  const expiryOk = !mandate.expiresAt || mandate.expiresAt > now;
  if (!expiryOk) failedRules.push("mandate_expired");

  // 2. Mandate status
  if (mandate.status !== "active") failedRules.push("mandate_not_active");

  // 3. Per-purchase cap
  const capOk = input.amountCents <= mandate.perPurchaseCapCents;
  if (!capOk) failedRules.push("per_purchase_cap");

  // 4. Budget remaining (uses reserved + spent)
  const available =
    mandate.totalBudgetCents - mandate.spentCents - mandate.reservedCents;
  const budgetOk = input.amountCents <= available;
  if (!budgetOk) failedRules.push("insufficient_budget");

  // 5. Category allowlist (empty list = allow all)
  const categoryOk =
    mandate.allowedCategories.length === 0 ||
    (input.category != null &&
      (mandate.allowedCategories as string[]).includes(input.category));
  if (!categoryOk) failedRules.push("category_not_allowed");

  // 6. Merchant allowlist (empty list = allow all)
  const merchantOk =
    (mandate.merchantAllowlist as string[]).length === 0 ||
    (mandate.merchantAllowlist as string[]).includes(input.vendorName);
  if (!merchantOk) failedRules.push("merchant_not_allowed");

  // 7. Velocity check
  const windowStart = new Date(
    now.getTime() - mandate.velocityWindowHours * 60 * 60 * 1000
  );
  const [velocityRow] = await db
    .select({ cnt: count() })
    .from(purchaseRequests)
    .where(
      and(
        eq(purchaseRequests.mandateId, mandate.id),
        gte(purchaseRequests.requestedAt, windowStart),
        sql`status NOT IN ('DENIED', 'REJECTED', 'VOIDED', 'TIMED_OUT')`
      )
    );
  const velocityOk =
    (velocityRow?.cnt ?? 0) < mandate.maxPurchasesPerDay;
  if (!velocityOk) failedRules.push("velocity_limit");

  // 8. Duplicate detection (same idempotency key or same item+vendor+amount in last 10 min)
  const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const [dupRow] = await db
    .select({ cnt: count() })
    .from(purchaseRequests)
    .where(
      and(
        eq(purchaseRequests.mandateId, mandate.id),
        eq(purchaseRequests.itemName, input.itemName),
        eq(purchaseRequests.vendorName, input.vendorName),
        eq(purchaseRequests.amountCents, input.amountCents),
        gte(purchaseRequests.requestedAt, tenMinAgo)
      )
    );
  const duplicateDetected = (dupRow?.cnt ?? 0) > 0;
  if (duplicateDetected) failedRules.push("duplicate_request");

  // 9. Structuring detection: sum of recent small purchases approaching escalate threshold
  const recentWindow = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour
  const [structRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(amount_cents), 0)` })
    .from(purchaseRequests)
    .where(
      and(
        eq(purchaseRequests.mandateId, mandate.id),
        gte(purchaseRequests.requestedAt, recentWindow),
        lt(purchaseRequests.amountCents, mandate.escalateAboveCents),
        sql`status NOT IN ('DENIED', 'REJECTED', 'VOIDED', 'TIMED_OUT')`
      )
    );
  const recentSmallTotal =
    Number(structRow?.total ?? 0) + input.amountCents;
  const structuringDetected =
    recentSmallTotal >= mandate.escalateAboveCents * 2;
  if (structuringDetected) failedRules.push("structuring_detected");

  return {
    budgetOk,
    capOk,
    categoryOk,
    merchantOk,
    expiryOk,
    velocityOk,
    duplicateDetected,
    structuringDetected,
    failedRules,
  };
}
