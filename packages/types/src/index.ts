import { z } from "zod";

// ────────────────────────────────────────────
// Mandate types
// ────────────────────────────────────────────
export const MandateStatusSchema = z.enum([
  "active",
  "suspended",
  "revoked",
  "expired",
]);
export type MandateStatus = z.infer<typeof MandateStatusSchema>;

export const CaptureModeSchema = z.enum(["immediate", "on_delivery"]);
export type CaptureMode = z.infer<typeof CaptureModeSchema>;

// ────────────────────────────────────────────
// Policy engine types
// ────────────────────────────────────────────
export const DecisionVerdictSchema = z.enum(["APPROVED", "ESCALATED", "DENIED"]);
export type DecisionVerdict = z.infer<typeof DecisionVerdictSchema>;

export const RuleResultsSchema = z.object({
  budgetOk: z.boolean(),
  capOk: z.boolean(),
  categoryOk: z.boolean(),
  merchantOk: z.boolean(),
  expiryOk: z.boolean(),
  velocityOk: z.boolean(),
  duplicateDetected: z.boolean(),
  structuringDetected: z.boolean(),
  semanticDedupMatch: z
    .object({ requestId: z.string(), similarity: z.number() })
    .nullable()
    .optional(),
  failedRules: z.array(z.string()),
});
export type RuleResults = z.infer<typeof RuleResultsSchema>;

export const LLMJudgeOutputSchema = z.object({
  verdict: DecisionVerdictSchema,
  reason: z.string(),
  riskFlags: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  injectionSuspected: z.boolean(),
});
export type LLMJudgeOutput = z.infer<typeof LLMJudgeOutputSchema>;

export const PolicyDecisionSchema = z.object({
  verdict: DecisionVerdictSchema,
  ruleResults: RuleResultsSchema,
  llmOutput: LLMJudgeOutputSchema.nullable(),
  injectionDetected: z.boolean(),
  injectionDetails: z.string().optional(),
  plainReason: z.string(),
});
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

// ────────────────────────────────────────────
// MCP Tool schemas
// ────────────────────────────────────────────
export const SearchProductsInputSchema = z.object({
  query: z.string().min(1).max(500),
  category: z.string().optional(),
  maxResults: z.number().int().min(1).max(20).default(5),
  maxPriceCents: z.number().int().positive().optional(),
});
export type SearchProductsInput = z.infer<typeof SearchProductsInputSchema>;

export const RequestPurchaseInputSchema = z.object({
  idempotencyKey: z.string().uuid(),
  itemName: z.string().min(1).max(500),
  itemDescription: z.string().max(2000).optional(),
  vendorName: z.string().min(1).max(255),
  vendorId: z.string().optional(),
  category: z.string().optional(),
  amountCents: z.number().int().positive(),
  currency: z.string().length(3).default("USD"),
  justification: z.string().min(10).max(2000),
  productMetadata: z.record(z.unknown()).optional(),
});
export type RequestPurchaseInput = z.infer<typeof RequestPurchaseInputSchema>;

export const RequestPurchaseOutputSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum([
    "APPROVED",
    "ESCALATED",
    "DENIED",
    "REQUESTED",
    "EVALUATING",
  ]),
  reason: z.string(),
  // Signed receipt (base64 Ed25519 signature over decision JSON)
  signedReceipt: z.string().optional(),
  // If ESCALATED, a link the human can use to review in the cockpit
  escalationUrl: z.string().url().optional(),
});
export type RequestPurchaseOutput = z.infer<typeof RequestPurchaseOutputSchema>;

export const GetMandateStatusOutputSchema = z.object({
  mandateId: z.string().uuid(),
  status: MandateStatusSchema,
  purpose: z.string(),
  totalBudgetCents: z.number(),
  spentCents: z.number(),
  reservedCents: z.number(),
  remainingCents: z.number(),
  perPurchaseCapCents: z.number(),
  escalateAboveCents: z.number(),
  expiresAt: z.string().datetime().nullable(),
  allowedCategories: z.array(z.string()),
});
export type GetMandateStatusOutput = z.infer<typeof GetMandateStatusOutputSchema>;

export const ReportDeliveryIssueInputSchema = z.object({
  purchaseRequestId: z.string().uuid(),
  issueType: z.enum([
    "NOT_DELIVERED",
    "WRONG_ITEM",
    "DAMAGED",
    "PARTIAL_DELIVERY",
    "OTHER",
  ]),
  details: z.string().max(2000),
});
export type ReportDeliveryIssueInput = z.infer<typeof ReportDeliveryIssueInputSchema>;

// ────────────────────────────────────────────
// State machine
// ────────────────────────────────────────────
export const PurchaseStatusSchema = z.enum([
  "REQUESTED",
  "EVALUATING",
  "DENIED",
  "ESCALATED",
  "APPROVED",
  "AUTHORIZED",
  "AWAITING_DELIVERY",
  "CAPTURED",
  "VOIDED",
  "TIMED_OUT",
  "EXPIRED",
  "REJECTED",
]);
export type PurchaseStatus = z.infer<typeof PurchaseStatusSchema>;

// ────────────────────────────────────────────
// PayPal Webhook event types
// ────────────────────────────────────────────
export const PAYPAL_WEBHOOK_EVENTS = [
  "PAYMENT.AUTHORIZATION.CREATED",
  "PAYMENT.AUTHORIZATION.VOIDED",
  "PAYMENT.CAPTURE.COMPLETED",
  "PAYMENT.CAPTURE.DENIED",
  "PAYMENT.CAPTURE.REFUNDED",
] as const;
export type PayPalWebhookEvent = (typeof PAYPAL_WEBHOOK_EVENTS)[number];
