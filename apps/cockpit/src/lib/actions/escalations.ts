"use server";

import { revalidatePath } from "next/cache";
import {
  db,
  escalations,
  purchaseRequests,
  mandates,
  paymentRecords,
} from "@leash/db";
import { eq } from "drizzle-orm";
import { getUserProfile } from "./user";
import { authorizePayPalVaultPayment } from "./paypal";
import { randomUUID } from "node:crypto";

export async function approveEscalation(
  escalationId: string,
  comment?: string
): Promise<{
  success: boolean;
  authorizationId?: string;
  orderId?: string;
  message?: string;
  error?: string;
}> {
  try {
    const profileRes = await getUserProfile();
    const operator = profileRes.user;

    // 1. Fetch escalation with linked purchase request and mandate
    const [esc] = await db
      .select({
        escalation: escalations,
        purchaseRequest: purchaseRequests,
        mandate: mandates,
      })
      .from(escalations)
      .innerJoin(purchaseRequests, eq(escalations.purchaseRequestId, purchaseRequests.id))
      .innerJoin(mandates, eq(purchaseRequests.mandateId, mandates.id))
      .where(eq(escalations.id, escalationId))
      .limit(1);

    if (!esc) {
      return { success: false, error: "Escalation request not found." };
    }

    if (esc.escalation.status !== "PENDING") {
      return { success: false, error: `Escalation is already ${esc.escalation.status}.` };
    }

    const { purchaseRequest, mandate } = esc;

    // 2. Budget verification
    const availableCents = mandate.totalBudgetCents - mandate.spentCents - mandate.reservedCents;
    if (availableCents < purchaseRequest.amountCents) {
      return {
        success: false,
        error: `Insufficient mandate budget. Requested $${(purchaseRequest.amountCents / 100).toFixed(2)}, but only $${(availableCents / 100).toFixed(2)} is available.`,
      };
    }

    // 3. Real PayPal Sandbox 2PC Authorization
    const vaultId = operator?.vaultId || "1gm62276cp965960w";
    console.log(`[approveEscalation] Placing PayPal Sandbox 2PC Hold with Vault Token ${vaultId}...`);

    const authRes = await authorizePayPalVaultPayment({
      vaultId,
      amountCents: purchaseRequest.amountCents,
      description: `Approved Escalation: ${purchaseRequest.vendorName} - ${purchaseRequest.itemName.slice(0, 50)}`,
      referenceId: `esc_${purchaseRequest.id.slice(0, 8)}`,
    });

    if (!authRes.success || !authRes.authorizationId) {
      return {
        success: false,
        error: `PayPal Sandbox Authorization declined: ${authRes.error ?? "No authorization ID returned"}`,
      };
    }

    // 4. Record payment record linked to PayPal
    const idempotencyKey = `esc_req_${randomUUID()}`;
    await db.insert(paymentRecords).values({
      purchaseRequestId: purchaseRequest.id,
      paypalOrderId: authRes.orderId ?? `ord_${Date.now()}`,
      paypalAuthorizationId: authRes.authorizationId,
      paypalCaptureId: null,
      paypalRequestId: idempotencyKey,
      status: "AUTHORIZED",
      amountCents: purchaseRequest.amountCents,
      currency: "USD",
      authorizedAt: new Date(),
    });

    // 5. Update purchase request & escalation statuses
    await db
      .update(purchaseRequests)
      .set({
        status: "AUTHORIZED",
        authorizedAt: new Date(),
      })
      .where(eq(purchaseRequests.id, purchaseRequest.id));

    await db
      .update(escalations)
      .set({
        status: "APPROVED",
        reviewedById: operator?.id ?? null,
        humanComment: comment?.trim() || null,
        reviewedAt: new Date(),
      })
      .where(eq(escalations.id, escalationId));

    // 6. Update mandate reserved budget
    await db
      .update(mandates)
      .set({
        reservedCents: mandate.reservedCents + purchaseRequest.amountCents,
        updatedAt: new Date(),
      })
      .where(eq(mandates.id, mandate.id));

    revalidatePath("/escalations");
    revalidatePath("/mandates");
    revalidatePath("/ledger");
    revalidatePath("/");

    return {
      success: true,
      authorizationId: authRes.authorizationId,
      ...(authRes.orderId ? { orderId: authRes.orderId } : {}),
      message: `Approved! Placed real PayPal Sandbox 2PC Hold for $${(purchaseRequest.amountCents / 100).toFixed(2)} (Auth ID: ${authRes.authorizationId}).`,
    };
  } catch (err: any) {
    console.error("[approveEscalation] error:", err);
    return { success: false, error: err.message ?? "Failed to approve escalation" };
  }
}

export async function rejectEscalation(
  escalationId: string,
  comment?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const profileRes = await getUserProfile();
    const operator = profileRes.user;

    const [esc] = await db
      .select({
        escalation: escalations,
        purchaseRequest: purchaseRequests,
      })
      .from(escalations)
      .innerJoin(purchaseRequests, eq(escalations.purchaseRequestId, purchaseRequests.id))
      .where(eq(escalations.id, escalationId))
      .limit(1);

    if (!esc) {
      return { success: false, error: "Escalation request not found." };
    }

    if (esc.escalation.status !== "PENDING") {
      return { success: false, error: `Escalation is already ${esc.escalation.status}.` };
    }

    // 1. Mark purchase request as REJECTED
    await db
      .update(purchaseRequests)
      .set({
        status: "REJECTED",
        voidedAt: new Date(),
      })
      .where(eq(purchaseRequests.id, esc.purchaseRequest.id));

    // 2. Mark escalation as REJECTED
    await db
      .update(escalations)
      .set({
        status: "REJECTED",
        reviewedById: operator?.id ?? null,
        humanComment: comment?.trim() || null,
        reviewedAt: new Date(),
      })
      .where(eq(escalations.id, escalationId));

    revalidatePath("/escalations");
    revalidatePath("/mandates");
    revalidatePath("/ledger");
    revalidatePath("/");

    return {
      success: true,
      message: "Purchase request rejected. No funds were held or charged.",
    };
  } catch (err: any) {
    console.error("[rejectEscalation] error:", err);
    return { success: false, error: err.message ?? "Failed to reject escalation" };
  }
}

/**
 * Helper to trigger a realistic over-cap escalation for live testing
 */
export async function triggerDemoEscalation(targetMandateId?: string): Promise<{
  success: boolean;
  escalationId?: string;
  error?: string;
}> {
  try {
    let mandateQuery = db.select().from(mandates).where(eq(mandates.status, "active"));
    const activeMandates = await mandateQuery.limit(1);

    if (activeMandates.length === 0) {
      return { success: false, error: "No active mandate available to escalate." };
    }

    const foundMandates = targetMandateId
      ? await db.select().from(mandates).where(eq(mandates.id, targetMandateId)).limit(1)
      : activeMandates;

    const mandate = foundMandates[0] || activeMandates[0];
    if (!mandate) {
      return { success: false, error: "No active mandate found to escalate." };
    }

    const idempotencyKey = `demo_esc_${randomUUID()}`;
    const amountCents = 12000; // $120.00 (exceeds $50.00 cap)

    const [req] = await db
      .insert(purchaseRequests)
      .values({
        mandateId: mandate.id,
        agentId: mandate.agentId,
        itemName: "A100 GPU Cluster Compute (8x GPUs - 24h Reservation)",
        vendorName: "RunPod GPU Cloud",
        category: "7372",
        amountCents,
        currency: "USD",
        justification: "Distributed LLM fine-tuning batch processing for customer pipeline",
        status: "ESCALATED",
        idempotencyKey,
      })
      .returning();

    if (!req) return { success: false, error: "Failed to create purchase request" };

    const [esc] = await db
      .insert(escalations)
      .values({
        purchaseRequestId: req.id,
        status: "PENDING",
        leashReasoning: `Triggers Human Escalation: Amount $120.00 exceeds single-purchase cap of $${(mandate.perPurchaseCapCents / 100).toFixed(2)}.`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h SLA
      })
      .returning();

    revalidatePath("/escalations");
    revalidatePath("/mandates");
    revalidatePath("/");

    return {
      success: true,
      ...(esc ? { escalationId: esc.id } : {}),
    };
  } catch (error: any) {
    console.error("[triggerDemoEscalation] error:", error);
    return { success: false, error: error.message };
  }
}
