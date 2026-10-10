/**
 * Agent Leash – Gateway MCP Server
 *
 * Exposes four MCP tools to connected agents:
 *   1. search_products     – Channel3 product search (proxied)
 *   2. request_purchase    – the core tool; triggers full policy evaluation
 *   3. get_mandate_status  – lets the agent know its budget/status
 *   4. report_delivery_issue – agent reports a problem after purchase
 *
 * Security model:
 *   - Each connection must present a Bearer token (scoped API key)
 *   - API key is resolved to exactly one mandate
 *   - PayPal secrets never leave this process
 *   - All decisions are logged to the append-only ledger
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { db } from "@leash/db";
import { PolicyEngine } from "@leash/policy-engine";
import { PaymentOrchestrator } from "../orchestrator/payment-orchestrator.js";
import { LedgerService } from "../ledger/ledger-service.js";
import { resolveAgentMandate } from "../auth/resolve-mandate.js";
import { searchChannel3Products } from "../integrations/channel3.js";
import type {
  RequestPurchaseInput,
  SearchProductsInput,
  ReportDeliveryIssueInput,
} from "@leash/types";

export async function createMcpServer(agentApiKey: string) {
  // Resolve mandate for this agent key
  const { agent, mandate } = await resolveAgentMandate(agentApiKey, db);

  const policyEngine = new PolicyEngine(db);
  const orchestrator = new PaymentOrchestrator(db);
  const ledger = new LedgerService(db);

  const server = new McpServer({
    name: "agent-leash-gateway",
    version: "0.1.0",
  });

  // ─── Tool: search_products ──────────────────────────────────────────
  server.tool(
    "search_products",
    "Search for products using Channel3. Returns real product data.",
    {
      query: z.string().min(1).max(500).describe("Product search query"),
      category: z.string().optional().describe("Optional category filter"),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(5)
        .describe("Maximum number of results"),
      maxPriceCents: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Maximum price in cents"),
    },
    async (input: SearchProductsInput) => {
      const products = await searchChannel3Products(input);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(products, null, 2),
          },
        ],
      };
    }
  );

  // ─── Tool: request_purchase ─────────────────────────────────────────
  server.tool(
    "request_purchase",
    `Request a purchase on behalf of the user. Leash will evaluate the request against the mandate policy and either approve, escalate for human review, or deny it. You will receive a plain-English reason and a signed receipt.`,
    {
      idempotencyKey: z
        .string()
        .uuid()
        .describe("UUID v4 you generate; prevents duplicate purchases on retry"),
      itemName: z.string().min(1).max(500),
      itemDescription: z.string().max(2000).optional(),
      vendorName: z.string().min(1).max(255),
      vendorId: z.string().optional().describe("Channel3 vendor ID"),
      category: z.string().optional(),
      amountCents: z.number().int().positive().describe("Amount in cents"),
      currency: z.string().length(3).default("USD"),
      justification: z
        .string()
        .min(10)
        .max(2000)
        .describe("Why this purchase matches the mandate purpose"),
      productMetadata: z.record(z.unknown()).optional(),
    },
    async (input: RequestPurchaseInput) => {
      // 1. Run policy evaluation
      const decision = await policyEngine.evaluate(input, mandate);

      // 2. Persist request + decision in a transaction
      const { purchaseRequest } = await orchestrator.createRequest(
        input,
        agent,
        mandate,
        decision
      );

      // 3. Write to ledger
      await ledger.append({
        mandateId: mandate.id,
        entryType: "DECISION_MADE",
        entityType: "purchase_request",
        entityId: purchaseRequest.id,
        payload: { decision, input: { ...input, justification: "[redacted]" } },
        actorType: "agent",
        actorId: agent.id,
      });

      // 4. If approved, trigger authorization immediately
      if (decision.verdict === "APPROVED") {
        await orchestrator.authorizePayment(purchaseRequest.id, mandate);
      }

      // 5. If escalated, create escalation record
      if (decision.verdict === "ESCALATED") {
        await orchestrator.createEscalation(purchaseRequest.id, decision);
      }

      const result = {
        requestId: purchaseRequest.id,
        status: decision.verdict,
        reason: decision.plainReason,
        signedReceipt: decision.verdict !== "DENIED" ? "receipt_placeholder" : undefined,
        escalationUrl:
          decision.verdict === "ESCALATED"
            ? `${process.env["COCKPIT_URL"]}/escalations/${purchaseRequest.id}`
            : undefined,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ─── Tool: get_mandate_status ───────────────────────────────────────
  server.tool(
    "get_mandate_status",
    "Get the current status of the mandate: budget remaining, spend, categories allowed, and expiry.",
    {},
    async () => {
      const remaining =
        mandate.totalBudgetCents - mandate.spentCents - mandate.reservedCents;
      const status = {
        mandateId: mandate.id,
        status: mandate.status,
        purpose: mandate.purpose,
        totalBudgetCents: mandate.totalBudgetCents,
        spentCents: mandate.spentCents,
        reservedCents: mandate.reservedCents,
        remainingCents: remaining,
        perPurchaseCapCents: mandate.perPurchaseCapCents,
        escalateAboveCents: mandate.escalateAboveCents,
        expiresAt: mandate.expiresAt?.toISOString() ?? null,
        allowedCategories: mandate.allowedCategories,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
      };
    }
  );

  // ─── Tool: report_delivery_issue ───────────────────────────────────
  server.tool(
    "report_delivery_issue",
    "Report a delivery problem (not received, wrong item, damaged). Leash will log it and initiate evidence collection.",
    {
      purchaseRequestId: z.string().uuid(),
      issueType: z.enum([
        "NOT_DELIVERED",
        "WRONG_ITEM",
        "DAMAGED",
        "PARTIAL_DELIVERY",
        "OTHER",
      ]),
      details: z.string().max(2000),
    },
    async (input: ReportDeliveryIssueInput) => {
      await orchestrator.reportDeliveryIssue(input, agent);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message:
                "Delivery issue recorded. Leash has logged this and the evidence pack is being prepared. The human owner will be notified.",
            }),
          },
        ],
      };
    }
  );

  return server;
}
