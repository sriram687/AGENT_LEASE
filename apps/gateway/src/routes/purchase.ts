/**
 * Agent Purchase Endpoint
 *
 * POST /api/purchase
 *
 * Core agent interface. Receives a purchase intent from an autonomous agent,
 * evaluates it against the signed mandate via the 4-layer PolicyEngine,
 * places a real PayPal Sandbox 2PC hold if approved, and records every step
 * in the immutable SHA-256 ledger.
 */
import { Hono } from "hono";
import {
  db,
  mandates,
  agents,
  users,
  purchaseRequests,
  escalations,
  paymentRecords,
  ledgerEntries,
  eq,
  desc,
} from "@leash/db";
import { PolicyEngine } from "@leash/policy-engine";
import { authorizePayPalVaultHold } from "@leash/payment-orchestrator";
import {
  computeEntryHash,
  GENESIS_HASH,
  verifySignature,
  getMandateSigningPayload,
  signPayload,
} from "@leash/crypto";
import { randomUUID } from "node:crypto";
import type { RequestPurchaseInput } from "@leash/types";

export const purchaseRouter = new Hono();

const policyEngine = new PolicyEngine(db);

async function appendGatewayLedgerEntry(input: {
  mandateId: string;
  entryType: any;
  entityType: string;
  entityId: string;
  payload: Record<string, any>;
  actorType: "agent" | "operator" | "system";
  actorId: string;
}) {
  try {
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
    const entryHash = computeEntryHash(previousHash, input.payload);

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
  } catch (err) {
    console.error("[appendGatewayLedgerEntry] error:", err);
  }
}

purchaseRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const {
      mandateId,
      itemName,
      vendorName,
      category,
      amountCents,
      justification,
      currency = "USD",
    } = body;

    if (!mandateId || !itemName || !amountCents) {
      return c.json(
        { error: "Missing required fields: mandateId, itemName, amountCents" },
        400
      );
    }

    // 1. Fetch Mandate
    const [mandate] = await db
      .select()
      .from(mandates)
      .where(eq(mandates.id, mandateId))
      .limit(1);

    if (!mandate) {
      return c.json({ error: "Mandate not found" }, 404);
    }

    if (mandate.status !== "active") {
      return c.json(
        {
          verdict: "DENIED",
          reason: `Mandate is ${mandate.status.toUpperCase()}. All transactions blocked.`,
        },
        403
      );
    }

    // 2. Fetch Linked Agent
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, mandate.agentId))
      .limit(1);

    const agentId = agent?.id ?? mandate.agentId;

    // 3. Evaluate through Policy Engine
    const input: RequestPurchaseInput = {
      itemName,
      vendorName: vendorName ?? "Unknown Vendor",
      category: category ?? "general",
      amountCents: Number(amountCents),
      currency,
      justification: justification ?? itemName,
      idempotencyKey: randomUUID(),
    };

    const decision = await policyEngine.evaluate(input, mandate);

    // ─── VERDICT: DENIED ────────────────────────────────────────────────
    if (decision.verdict === "DENIED") {
      const [req] = await db
        .insert(purchaseRequests)
        .values({
          mandateId: mandate.id,
          agentId,
          itemName,
          vendorName: input.vendorName,
          category: input.category ?? null,
          amountCents: input.amountCents,
          currency,
          justification: input.justification,
          status: "REJECTED",
          idempotencyKey: input.idempotencyKey,
        })
        .returning();

      if (req) {
        await appendGatewayLedgerEntry({
          mandateId: mandate.id,
          entryType: "REQUEST_RECEIVED",
          entityType: "purchase_request",
          entityId: req.id,
          payload: {
            id: req.id,
            itemName,
            amountCents: input.amountCents,
            decision: "DENIED",
            reason: decision.plainReason,
          },
          actorType: "agent",
          actorId: agentId,
        });

        await appendGatewayLedgerEntry({
          mandateId: mandate.id,
          entryType: "DECISION_MADE",
          entityType: "purchase_request",
          entityId: req.id,
          payload: {
            purchaseRequestId: req.id,
            verdict: "DENIED",
            plainReason: decision.plainReason,
            injectionDetected: decision.injectionDetected ?? false,
          },
          actorType: "system",
          actorId: "leash_policy_engine",
        });
      }

      return c.json(
        {
          verdict: "DENIED",
          reason: decision.plainReason,
          injectionDetected: decision.injectionDetected ?? false,
        },
        403
      );
    }

    // ─── VERDICT: ESCALATED ─────────────────────────────────────────────
    if (decision.verdict === "ESCALATED") {
      const [req] = await db
        .insert(purchaseRequests)
        .values({
          mandateId: mandate.id,
          agentId,
          itemName,
          vendorName: input.vendorName,
          category: input.category ?? null,
          amountCents: input.amountCents,
          currency,
          justification: input.justification,
          status: "ESCALATED",
          idempotencyKey: input.idempotencyKey,
        })
        .returning();

      if (!req) {
        return c.json({ error: "Failed to persist purchase request" }, 500);
      }

      const [esc] = await db
        .insert(escalations)
        .values({
          purchaseRequestId: req.id,
          status: "PENDING",
          leashReasoning: decision.plainReason,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h SLA
        })
        .returning();

      await appendGatewayLedgerEntry({
        mandateId: mandate.id,
        entryType: "REQUEST_RECEIVED",
        entityType: "purchase_request",
        entityId: req.id,
        payload: {
          id: req.id,
          itemName,
          amountCents: input.amountCents,
          status: "ESCALATED",
          reason: decision.plainReason,
        },
        actorType: "agent",
        actorId: agentId,
      });

      if (esc) {
        await appendGatewayLedgerEntry({
          mandateId: mandate.id,
          entryType: "ESCALATION_CREATED",
          entityType: "escalation",
          entityId: esc.id,
          payload: {
            id: esc.id,
            purchaseRequestId: req.id,
            amountCents: input.amountCents,
            reason: esc.leashReasoning,
          },
          actorType: "system",
          actorId: "leash_policy_engine",
        });
      }

      return c.json(
        {
          verdict: "ESCALATED",
          escalationId: esc?.id,
          purchaseRequestId: req.id,
          reason: decision.plainReason,
          slaHours: 24,
        },
        202
      );
    }

    // ─── VERDICT: APPROVED (Execute 2PC Real PayPal Sandbox Hold) ───────
    // Look up owner's PayPal Vault token
    const [owner] = await db
      .select({ vaultId: users.vaultId })
      .from(users)
      .where(eq(users.id, mandate.ownerId))
      .limit(1);

    const vaultId = owner?.vaultId || "1gm62276cp965960w";

    const authRes = await authorizePayPalVaultHold({
      vaultId,
      amountCents: input.amountCents,
      description: `Agent Leash Hold: ${input.vendorName} - ${input.itemName.slice(0, 50)}`,
      referenceId: input.idempotencyKey,
      currency,
    });

    if (!authRes.success || !authRes.authorizationId) {
      return c.json(
        {
          verdict: "DENIED",
          reason: `PayPal Sandbox 2PC Authorization declined: ${authRes.error ?? "No authorization ID"}`,
        },
        400
      );
    }

    // Update mandate reserved balance
    await db
      .update(mandates)
      .set({
        reservedCents: mandate.reservedCents + input.amountCents,
        updatedAt: new Date(),
      })
      .where(eq(mandates.id, mandate.id));

    // Persist purchase request
    const [req] = await db
      .insert(purchaseRequests)
      .values({
        mandateId: mandate.id,
        agentId,
        itemName,
        vendorName: input.vendorName,
        category: input.category ?? null,
        amountCents: input.amountCents,
        currency,
        justification: input.justification,
        status: "AUTHORIZED",
        idempotencyKey: input.idempotencyKey,
      })
      .returning();

    // Persist payment record
    if (req) {
      const [payment] = await db
        .insert(paymentRecords)
        .values({
          purchaseRequestId: req.id,
          paypalOrderId: authRes.orderId ?? `ord_${Date.now()}`,
          paypalAuthorizationId: authRes.authorizationId ?? null,
          paypalCaptureId: null,
          paypalRequestId: input.idempotencyKey,
          status: "AUTHORIZED",
          amountCents: input.amountCents,
          currency,
          authorizedAt: new Date(),
        })
        .returning();

      // Append ledger entries
      await appendGatewayLedgerEntry({
        mandateId: mandate.id,
        entryType: "REQUEST_RECEIVED",
        entityType: "purchase_request",
        entityId: req.id,
        payload: {
          id: req.id,
          itemName,
          vendorName: input.vendorName,
          amountCents: input.amountCents,
        },
        actorType: "agent",
        actorId: agentId,
      });

      if (payment) {
        await appendGatewayLedgerEntry({
          mandateId: mandate.id,
          entryType: "PAYMENT_AUTHORIZED",
          entityType: "payment_record",
          entityId: payment.id,
          payload: {
            id: payment.id,
            purchaseRequestId: req.id,
            paypalOrderId: authRes.orderId,
            paypalAuthorizationId: authRes.authorizationId,
            amountCents: input.amountCents,
            currency,
            status: "AUTHORIZED",
          },
          actorType: "system",
          actorId: "paypal_gateway",
        });
      }
    }

    return c.json({
      verdict: "APPROVED",
      purchaseRequestId: req?.id,
      paypalOrderId: authRes.orderId,
      paypalAuthorizationId: authRes.authorizationId,
      amountCents: input.amountCents,
      status: "AUTHORIZED_HOLD",
      message: `2PC Authorization Hold placed on PayPal Sandbox! Amount $${(input.amountCents / 100).toFixed(2)} reserved.`,
    });
  } catch (error: any) {
    console.error("[POST /api/purchase] Exception:", error);
    return c.json({ error: error.message ?? "Internal gateway error" }, 500);
  }
});
