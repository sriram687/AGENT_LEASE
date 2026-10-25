"use server";

import { revalidatePath } from "next/cache";
import {
  db,
  ledgerEntries,
  mandates,
  purchaseRequests,
  paymentRecords,
  escalations,
} from "@leash/db";
import { eq, desc, asc } from "drizzle-orm";
import {
  computeEntryHash,
  verifyChain,
  GENESIS_HASH,
} from "@leash/crypto";
import { getUserProfile } from "./user";

export type LedgerEntryType =
  | "MANDATE_CREATED"
  | "MANDATE_UPDATED"
  | "MANDATE_REVOKED"
  | "REQUEST_RECEIVED"
  | "DECISION_MADE"
  | "ESCALATION_CREATED"
  | "ESCALATION_RESOLVED"
  | "PAYMENT_AUTHORIZED"
  | "PAYMENT_REAUTHORIZED"
  | "PAYMENT_CAPTURED"
  | "PAYMENT_VOIDED"
  | "PAYMENT_REFUNDED"
  | "DELIVERY_CONFIRMED"
  | "KILL_SWITCH_ACTIVATED";

export interface AppendLedgerEntryInput {
  mandateId: string;
  entryType: LedgerEntryType;
  entityType: string;
  entityId: string;
  payload: Record<string, any>;
  actorType: "agent" | "operator" | "system";
  actorId: string;
}

export async function appendLedgerEntry(input: AppendLedgerEntryInput): Promise<{
  success: boolean;
  sequence?: number;
  entryHash?: string;
  previousHash?: string;
  error?: string;
}> {
  try {
    // 1. Fetch latest entry to find next sequence and previous hash
    const [lastEntry] = await db
      .select({
        sequence: ledgerEntries.sequence,
        entryHash: ledgerEntries.entryHash,
      })
      .from(ledgerEntries)
      .orderBy(desc(ledgerEntries.sequence))
      .limit(1);

    const sequence = lastEntry ? lastEntry.sequence + 1 : 1;
    const previousHash = lastEntry ? lastEntry.entryHash : GENESIS_HASH;

    // 2. Compute cryptographically chained SHA-256 hash
    const entryHash = computeEntryHash(previousHash, input.payload);

    // 3. Insert immutable ledger block
    await db.insert(ledgerEntries).values({
      sequence,
      mandateId: input.mandateId,
      entryType: input.entryType,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: input.payload,
      previousHash,
      entryHash,
      actorType: input.actorType,
      actorId: input.actorId,
    });

    revalidatePath("/ledger");
    revalidatePath("/");

    return {
      success: true,
      sequence,
      entryHash,
      previousHash,
    };
  } catch (error: any) {
    console.error("[appendLedgerEntry] error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Verify cryptographic hash integrity across all ledger blocks.
 */
export async function verifyLedgerIntegrity(): Promise<{
  valid: boolean;
  totalBlocks: number;
  latestHash: string;
  genesisHash: string;
  brokenAtIndex?: number;
}> {
  try {
    const entries = await db
      .select({
        previousHash: ledgerEntries.previousHash,
        entryHash: ledgerEntries.entryHash,
        payload: ledgerEntries.payload,
        sequence: ledgerEntries.sequence,
      })
      .from(ledgerEntries)
      .orderBy(asc(ledgerEntries.sequence));

    if (entries.length === 0) {
      return {
        valid: true,
        totalBlocks: 0,
        latestHash: GENESIS_HASH,
        genesisHash: GENESIS_HASH,
      };
    }

    const result = verifyChain(
      entries.map((e) => ({
        previousHash: e.previousHash,
        entryHash: e.entryHash,
        payload: e.payload,
      }))
    );

    return {
      valid: result.valid,
      totalBlocks: entries.length,
      latestHash: entries[entries.length - 1]!.entryHash,
      genesisHash: GENESIS_HASH,
      ...(result.brokenAtIndex !== undefined ? { brokenAtIndex: result.brokenAtIndex } : {}),
    };
  } catch (error: any) {
    console.error("[verifyLedgerIntegrity] error:", error);
    return {
      valid: false,
      totalBlocks: 0,
      latestHash: GENESIS_HASH,
      genesisHash: GENESIS_HASH,
    };
  }
}

/**
 * Replay database state into ledger entries if the ledger is currently unpopulated.
 * Builds a 100% valid SHA-256 chain representing all real events from genesis.
 */
export async function syncLedgerFromDatabase(): Promise<{
  success: boolean;
  syncedBlocks: number;
  error?: string;
}> {
  try {
    const profileRes = await getUserProfile();
    const operator = profileRes.user;
    const operatorId = operator?.id || "operator";

    // 1. Fetch all mandates
    const allMandates = await db.select().from(mandates).orderBy(asc(mandates.createdAt));

    for (const m of allMandates) {
      // Check if MANDATE_CREATED already exists
      const [existing] = await db
        .select({ id: ledgerEntries.id })
        .from(ledgerEntries)
        .where(eq(ledgerEntries.entityId, m.id))
        .limit(1);

      if (!existing) {
        await appendLedgerEntry({
          mandateId: m.id,
          entryType: "MANDATE_CREATED",
          entityType: "mandate",
          entityId: m.id,
          payload: {
            id: m.id,
            purpose: m.purpose,
            totalBudgetCents: m.totalBudgetCents,
            perPurchaseCapCents: m.perPurchaseCapCents,
            escalateAboveCents: m.escalateAboveCents,
            allowedCategories: m.allowedCategories,
            merchantAllowlist: m.merchantAllowlist,
          },
          actorType: "operator",
          actorId: operatorId,
        });
      }
    }

    // 2. Fetch all purchase requests & payments
    const allReqs = await db.select().from(purchaseRequests).orderBy(asc(purchaseRequests.requestedAt));

    for (const req of allReqs) {
      // Check if this request is already recorded
      const [existingReq] = await db
        .select({ id: ledgerEntries.id })
        .from(ledgerEntries)
        .where(eq(ledgerEntries.entityId, req.id))
        .limit(1);

      if (!existingReq) {
        await appendLedgerEntry({
          mandateId: req.mandateId,
          entryType: "REQUEST_RECEIVED",
          entityType: "purchase_request",
          entityId: req.id,
          payload: {
            id: req.id,
            itemName: req.itemName,
            vendorName: req.vendorName,
            amountCents: req.amountCents,
            category: req.category,
            justification: req.justification,
          },
          actorType: "agent",
          actorId: req.agentId,
        });
      }

      // Check linked payment records
      const [payment] = await db
        .select()
        .from(paymentRecords)
        .where(eq(paymentRecords.purchaseRequestId, req.id))
        .limit(1);

      if (payment) {
        const [existingPayment] = await db
          .select({ id: ledgerEntries.id })
          .from(ledgerEntries)
          .where(eq(ledgerEntries.entityId, payment.id))
          .limit(1);

        if (!existingPayment) {
          const entryType: LedgerEntryType =
            payment.status === "CAPTURED" ? "PAYMENT_CAPTURED" : "PAYMENT_AUTHORIZED";

          await appendLedgerEntry({
            mandateId: req.mandateId,
            entryType,
            entityType: "payment_record",
            entityId: payment.id,
            payload: {
              id: payment.id,
              purchaseRequestId: req.id,
              paypalOrderId: payment.paypalOrderId,
              paypalAuthorizationId: payment.paypalAuthorizationId,
              paypalCaptureId: payment.paypalCaptureId,
              amountCents: payment.amountCents,
              currency: payment.currency,
              status: payment.status,
            },
            actorType: "system",
            actorId: "paypal_gateway",
          });
        }
      }
    }

    const allBlocks = await db.select().from(ledgerEntries);
    revalidatePath("/ledger");
    return { success: true, syncedBlocks: allBlocks.length };
  } catch (error: any) {
    console.error("[syncLedgerFromDatabase] error:", error);
    return { success: false, syncedBlocks: 0, error: error.message };
  }
}
