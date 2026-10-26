"use server";

import { revalidatePath } from "next/cache";
import {
  db,
  paymentRecords,
  purchaseRequests,
  mandates,
  agents,
  deliveryEvents,
} from "@leash/db";
import { eq, desc } from "drizzle-orm";
import { capturePayPalAuthorization, voidPayPalAuthorization } from "./paypal";
import { appendLedgerEntry } from "./ledger";
import { getUserProfile } from "./user";

export interface ActiveHoldItem {
  paymentRecordId: string;
  purchaseRequestId: string;
  mandateId: string;
  agentId: string;
  agentName: string;
  mandatePurpose: string;
  itemName: string;
  vendorName: string;
  justification: string;
  amountCents: number;
  amountDollars: string;
  currency: string;
  status: string;
  paypalOrderId: string;
  paypalAuthorizationId: string;
  authorizedAt: Date | null;
  honorPeriodEndsAt: Date | null;
  authorizationExpiresAt: Date | null;
  createdAt: Date;
}

/**
 * Retrieve all currently active 2PC authorization holds from PostgreSQL.
 * These holds correspond to funds locked in the operator's PayPal Sandbox account.
 */
export async function getActiveHolds(mandateIdFilter?: string): Promise<{
  success: boolean;
  holds: ActiveHoldItem[];
  totalReservedCents: number;
  error?: string;
}> {
  try {
    const query = db
      .select({
        payment: paymentRecords,
        purchaseRequest: purchaseRequests,
        mandate: mandates,
        agent: agents,
      })
      .from(paymentRecords)
      .innerJoin(purchaseRequests, eq(paymentRecords.purchaseRequestId, purchaseRequests.id))
      .innerJoin(mandates, eq(purchaseRequests.mandateId, mandates.id))
      .innerJoin(agents, eq(mandates.agentId, agents.id))
      .where(eq(paymentRecords.status, "AUTHORIZED"))
      .orderBy(desc(paymentRecords.createdAt));

    const rows = await query;

    const filtered = mandateIdFilter
      ? rows.filter((r) => r.mandate.id === mandateIdFilter)
      : rows;

    const holds: ActiveHoldItem[] = filtered.map((row) => ({
      paymentRecordId: row.payment.id,
      purchaseRequestId: row.purchaseRequest.id,
      mandateId: row.mandate.id,
      agentId: row.agent.id,
      agentName: row.agent.name,
      mandatePurpose: row.mandate.purpose,
      itemName: row.purchaseRequest.itemName,
      vendorName: row.purchaseRequest.vendorName,
      justification: row.purchaseRequest.justification,
      amountCents: row.payment.amountCents,
      amountDollars: (row.payment.amountCents / 100).toFixed(2),
      currency: row.payment.currency || "USD",
      status: row.payment.status,
      paypalOrderId: row.payment.paypalOrderId,
      paypalAuthorizationId: row.payment.paypalAuthorizationId || "",
      authorizedAt: row.payment.authorizedAt,
      honorPeriodEndsAt: row.payment.honorPeriodEndsAt,
      authorizationExpiresAt: row.payment.authorizationExpiresAt,
      createdAt: row.payment.createdAt,
    }));

    const totalReservedCents = holds.reduce((acc, h) => acc + h.amountCents, 0);

    return {
      success: true,
      holds,
      totalReservedCents,
    };
  } catch (error: any) {
    console.error("[getActiveHolds] error:", error);
    return { success: false, holds: [], totalReservedCents: 0, error: error.message };
  }
}

/**
 * Confirm delivery and capture a 2PC hold:
 * 1. Executes real PayPal Sandbox Capture API (POST /v2/payments/authorizations/{id}/capture)
 * 2. Deducts amount from PayPal Sandbox balance
 * 3. Updates paymentRecords and purchaseRequests status to CAPTURED
 * 4. Shifts budget on mandate: reservedCents -= amountCents, spentCents += amountCents
 * 5. Records delivery event in delivery_events
 * 6. Appends immutable PAYMENT_CAPTURED & DELIVERY_CONFIRMED blocks to ledger
 * 7. Revalidates Cockpit paths
 */
export async function confirmDeliveryAndCaptureHold(input: {
  paymentRecordId: string;
  notes?: string;
}): Promise<{
  success: boolean;
  captureId?: string;
  message?: string;
  error?: string;
}> {
  try {
    const profileRes = await getUserProfile();
    const operator = profileRes.user;

    // 1. Fetch payment record and related records
    const [row] = await db
      .select({
        payment: paymentRecords,
        purchaseRequest: purchaseRequests,
        mandate: mandates,
      })
      .from(paymentRecords)
      .innerJoin(purchaseRequests, eq(paymentRecords.purchaseRequestId, purchaseRequests.id))
      .innerJoin(mandates, eq(purchaseRequests.mandateId, mandates.id))
      .where(eq(paymentRecords.id, input.paymentRecordId))
      .limit(1);

    if (!row) {
      return { success: false, error: "Payment record not found." };
    }

    const { payment, purchaseRequest, mandate } = row;

    if (payment.status !== "AUTHORIZED") {
      return {
        success: false,
        error: `Cannot capture payment with status '${payment.status}'. It has already been processed or voided.`,
      };
    }

    if (!payment.paypalAuthorizationId) {
      return {
        success: false,
        error: "Missing PayPal Authorization ID on this payment record.",
      };
    }

    console.log(
      `[confirmDeliveryAndCaptureHold] Firing real PayPal Sandbox Capture for Auth ID: ${payment.paypalAuthorizationId} ($${(payment.amountCents / 100).toFixed(2)})...`
    );

    // 2. Fire real PayPal Sandbox Capture API
    const captureRes = await capturePayPalAuthorization(
      payment.paypalAuthorizationId,
      payment.amountCents
    );

    if (!captureRes.success || !captureRes.captureId) {
      return {
        success: false,
        error: `PayPal Sandbox Capture declined: ${captureRes.error ?? "No capture ID returned"}`,
      };
    }

    const captureId = captureRes.captureId;
    const now = new Date();

    // 3. Update payment_records to CAPTURED
    await db
      .update(paymentRecords)
      .set({
        status: "CAPTURED",
        paypalCaptureId: captureId,
        capturedAt: now,
        rawCaptureSnapshot: captureRes.rawSnapshot || null,
        updatedAt: now,
      })
      .where(eq(paymentRecords.id, payment.id));

    // 4. Update purchase_requests to CAPTURED
    await db
      .update(purchaseRequests)
      .set({
        status: "CAPTURED",
        capturedAt: now,
      })
      .where(eq(purchaseRequests.id, purchaseRequest.id));

    // 5. Shift budget on mandate:
    // Move from Blue (reservedCents) to Green (spentCents)
    const newReserved = Math.max(0, mandate.reservedCents - payment.amountCents);
    const newSpent = mandate.spentCents + payment.amountCents;

    await db
      .update(mandates)
      .set({
        reservedCents: newReserved,
        spentCents: newSpent,
        updatedAt: now,
      })
      .where(eq(mandates.id, mandate.id));

    // 6. Record delivery event
    try {
      await db.insert(deliveryEvents).values({
        purchaseRequestId: purchaseRequest.id,
        eventType: "DELIVERED",
        carrier: "PayPal 2PC Settlement",
        trackingNumber: `PAYPAL-CAP-${captureId.slice(0, 16)}`,
        paypalTrackingId: captureId,
        rawPayload: {
          confirmedBy: operator?.name || "Operator",
          notes: input.notes || "Delivery confirmed by operator via Cockpit 2PC Drawer",
          amountCents: payment.amountCents,
          captureId,
          authorizationId: payment.paypalAuthorizationId,
        },
        occurredAt: now,
        recordedAt: now,
      });
    } catch (deliveryErr) {
      console.warn("[confirmDeliveryAndCaptureHold] Failed to insert delivery event:", deliveryErr);
    }

    // 7. Append immutable Ledger entries
    // Entry A: PAYMENT_CAPTURED
    await appendLedgerEntry({
      mandateId: mandate.id,
      entryType: "PAYMENT_CAPTURED",
      entityType: "payment_record",
      entityId: payment.id,
      payload: {
        paymentRecordId: payment.id,
        purchaseRequestId: purchaseRequest.id,
        mandateId: mandate.id,
        vendorName: purchaseRequest.vendorName,
        itemName: purchaseRequest.itemName,
        amountCents: payment.amountCents,
        paypalAuthorizationId: payment.paypalAuthorizationId,
        paypalCaptureId: captureId,
        status: "CAPTURED",
        actor: operator?.name || "Operator",
      },
      actorType: "operator",
      actorId: operator?.id || "operator",
    });

    // Entry B: DELIVERY_CONFIRMED
    await appendLedgerEntry({
      mandateId: mandate.id,
      entryType: "DELIVERY_CONFIRMED",
      entityType: "purchase_request",
      entityId: purchaseRequest.id,
      payload: {
        purchaseRequestId: purchaseRequest.id,
        mandateId: mandate.id,
        vendorName: purchaseRequest.vendorName,
        itemName: purchaseRequest.itemName,
        amountCents: payment.amountCents,
        captureId,
        notes: input.notes || "Operator confirmed delivery & captured escrow hold",
      },
      actorType: "operator",
      actorId: operator?.id || "operator",
    });

    // 8. Revalidate all Cockpit pages
    revalidatePath("/mandates");
    revalidatePath("/escalations");
    revalidatePath("/ledger");
    revalidatePath("/analytics");
    revalidatePath("/security");
    revalidatePath("/");

    return {
      success: true,
      captureId,
      message: `Successfully confirmed delivery & captured $${(payment.amountCents / 100).toFixed(2)} on PayPal Sandbox! (Capture ID: ${captureId})`,
    };
  } catch (error: any) {
    console.error("[confirmDeliveryAndCaptureHold] error:", error);
    return { success: false, error: error.message ?? "Failed to capture authorization hold" };
  }
}

/**
 * Void and release an active 2PC authorization hold:
 * 1. Calls PayPal Sandbox Void API (POST /v2/payments/authorizations/{id}/void)
 * 2. Unlocks the held funds in PayPal Sandbox with $0 fees
 * 3. Updates paymentRecords and purchaseRequests to VOIDED
 * 4. Releases reservedCents on the mandate back to available budget
 * 5. Appends PAYMENT_VOIDED to immutable ledger
 */
export async function releaseVoidHold(input: {
  paymentRecordId: string;
  reason?: string;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const profileRes = await getUserProfile();
    const operator = profileRes.user;

    const [row] = await db
      .select({
        payment: paymentRecords,
        purchaseRequest: purchaseRequests,
        mandate: mandates,
      })
      .from(paymentRecords)
      .innerJoin(purchaseRequests, eq(paymentRecords.purchaseRequestId, purchaseRequests.id))
      .innerJoin(mandates, eq(purchaseRequests.mandateId, mandates.id))
      .where(eq(paymentRecords.id, input.paymentRecordId))
      .limit(1);

    if (!row) {
      return { success: false, error: "Payment record not found." };
    }

    const { payment, purchaseRequest, mandate } = row;

    if (payment.status !== "AUTHORIZED") {
      return {
        success: false,
        error: `Cannot void payment with status '${payment.status}'.`,
      };
    }

    if (!payment.paypalAuthorizationId) {
      return {
        success: false,
        error: "Missing PayPal Authorization ID on this payment record.",
      };
    }

    console.log(
      `[releaseVoidHold] Voiding PayPal Sandbox Authorization ${payment.paypalAuthorizationId}...`
    );

    // 1. Call PayPal Sandbox Void API
    const voidRes = await voidPayPalAuthorization(payment.paypalAuthorizationId);
    if (!voidRes.success) {
      return {
        success: false,
        error: `PayPal Sandbox Void failed: ${voidRes.error}`,
      };
    }

    const now = new Date();

    // 2. Mark records as VOIDED
    await db
      .update(paymentRecords)
      .set({
        status: "VOIDED",
        voidedAt: now,
        updatedAt: now,
      })
      .where(eq(paymentRecords.id, payment.id));

    await db
      .update(purchaseRequests)
      .set({
        status: "VOIDED",
        voidedAt: now,
      })
      .where(eq(purchaseRequests.id, purchaseRequest.id));

    // 3. Release reservedCents back to available pool
    const newReserved = Math.max(0, mandate.reservedCents - payment.amountCents);
    await db
      .update(mandates)
      .set({
        reservedCents: newReserved,
        updatedAt: now,
      })
      .where(eq(mandates.id, mandate.id));

    // 4. Ledger entry
    await appendLedgerEntry({
      mandateId: mandate.id,
      entryType: "PAYMENT_VOIDED",
      entityType: "payment_record",
      entityId: payment.id,
      payload: {
        paymentRecordId: payment.id,
        purchaseRequestId: purchaseRequest.id,
        mandateId: mandate.id,
        amountCents: payment.amountCents,
        paypalAuthorizationId: payment.paypalAuthorizationId,
        reason: input.reason || "Released by operator before delivery confirmation",
      },
      actorType: "operator",
      actorId: operator?.id || "operator",
    });

    revalidatePath("/mandates");
    revalidatePath("/escalations");
    revalidatePath("/ledger");
    revalidatePath("/analytics");
    revalidatePath("/");

    return {
      success: true,
      message: `Hold of $${(payment.amountCents / 100).toFixed(2)} voided on PayPal Sandbox. Funds returned to mandate balance.`,
    };
  } catch (error: any) {
    console.error("[releaseVoidHold] error:", error);
    return { success: false, error: error.message ?? "Failed to void authorization hold" };
  }
}
