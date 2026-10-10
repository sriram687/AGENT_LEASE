/**
 * Payment Orchestrator (App Layer)
 *
 * Wraps the @leash/payment-orchestrator package with application-specific context.
 * Manages the state machine transitions and coordinates with the DB + PayPal SDK.
 *
 * State Machine:
 *  REQUESTED → EVALUATING → DENIED
 *                         → ESCALATED → APPROVED | REJECTED | EXPIRED
 *                         → APPROVED → AUTHORIZED → AWAITING_DELIVERY → CAPTURED
 *                                                                     → VOIDED / TIMED_OUT
 *
 * Budget reservation: all budget operations use row-level locks to prevent
 * concurrent overspend. The sequence is always:
 *   1. Lock mandate row (SELECT ... FOR UPDATE)
 *   2. Check remaining = total - spent - reserved
 *   3. If OK, increment reserved_cents
 *   4. Commit
 */
import type { DB } from "@leash/db";
import type { Mandate, Agent } from "@leash/db";
import type { PolicyDecision, RequestPurchaseInput } from "@leash/types";

// TODO Day 2: Implement full PayPal SDK integration
// import { ApiController } from "@paypal/paypal-server-sdk";

export class PaymentOrchestrator {
  constructor(private readonly db: DB) {}

  async createRequest(
    input: RequestPurchaseInput,
    agent: Agent,
    mandate: Mandate,
    decision: PolicyDecision
  ) {
    // TODO Day 2: Insert purchase_request + decision in a single transaction
    // with outbox event for async processing
    const purchaseRequest = {
      id: crypto.randomUUID(),
      mandateId: mandate.id,
      agentId: agent.id,
      ...input,
      status: decision.verdict,
    };
    return { purchaseRequest };
  }

  async authorizePayment(purchaseRequestId: string, mandate: Mandate) {
    // TODO Day 2:
    // 1. Lock mandate row for UPDATE
    // 2. Create PayPal order with intent: AUTHORIZE
    // 3. Authorize the order
    // 4. Update mandate.reserved_cents += amount
    // 5. Create payment_record
    // 6. Update purchase_request status → AUTHORIZED
    // 7. Schedule Render Workflow for delivery SLA check
    console.log(`TODO: authorize payment for request ${purchaseRequestId}`);
  }

  async createEscalation(purchaseRequestId: string, decision: PolicyDecision) {
    // TODO Day 2: Insert escalation record with 24h expiry
    console.log(`TODO: create escalation for request ${purchaseRequestId}`);
  }

  async capturePayment(purchaseRequestId: string) {
    // TODO Day 4: Called by delivery webhook handler
    // 1. Get payment_record for this request
    // 2. Check authorization is still within honor period
    // 3. If within day 3: capture directly
    // 4. If past day 3 but before day 29: reauthorize first, then capture
    // 5. Update mandate: spent += amount, reserved -= amount
    console.log(`TODO: capture payment for request ${purchaseRequestId}`);
  }

  async voidAuthorization(purchaseRequestId: string, reason: string) {
    // TODO Day 3: Called by kill switch or delivery timeout
    console.log(`TODO: void authorization for request ${purchaseRequestId}: ${reason}`);
  }

  async reportDeliveryIssue(
    input: { purchaseRequestId: string; issueType: string; details: string },
    agent: Agent
  ) {
    // TODO Day 4: Log delivery issue, prepare evidence pack
    console.log(`TODO: delivery issue reported by agent ${agent.id}:`, input);
  }
}
