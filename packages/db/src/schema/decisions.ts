import {
  pgTable,
  uuid,
  text,
  boolean,
  numeric,
  timestamp,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { purchaseRequests } from "./purchase-requests";

export const decisionVerdict = pgEnum("decision_verdict", [
  "APPROVED",
  "ESCALATED",
  "DENIED",
]);

export const decisions = pgTable("decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  purchaseRequestId: uuid("purchase_request_id")
    .notNull()
    .unique()
    .references(() => purchaseRequests.id, { onDelete: "cascade" }),

  verdict: decisionVerdict("verdict").notNull(),

  // Layer 1: Deterministic rule results (JSONB for flexibility)
  ruleResults: jsonb("rule_results")
    .$type<{
      budgetOk: boolean;
      capOk: boolean;
      categoryOk: boolean;
      merchantOk: boolean;
      expiryOk: boolean;
      velocityOk: boolean;
      duplicateDetected: boolean;
      structuringDetected: boolean;
      semanticDedupMatch?: { requestId: string; similarity: number } | null;
      failedRules: string[];
    }>()
    .notNull(),

  // Layer 2: LLM intent judge output
  llmVerdict: decisionVerdict("llm_verdict"),
  llmReason: text("llm_reason"),
  llmRiskFlags: jsonb("llm_risk_flags").$type<string[]>(),
  llmConfidence: numeric("llm_confidence", { precision: 4, scale: 3 }),

  // Layer 3: Injection screen result
  injectionDetected: boolean("injection_detected").notNull().default(false),
  injectionDetails: text("injection_details"),

  // Human-readable explanation (surfaced in cockpit and to the agent)
  plainReason: text("plain_reason").notNull(),

  // Cryptographic signed receipt (base64 Ed25519 sig over canonicalized decision JSON)
  signedReceipt: text("signed_receipt"),

  decidedAt: timestamp("decided_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Decision = typeof decisions.$inferSelect;
export type NewDecision = typeof decisions.$inferInsert;
