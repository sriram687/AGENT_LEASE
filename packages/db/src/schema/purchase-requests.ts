import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
  jsonb,
  varchar,
} from "drizzle-orm/pg-core";
import { mandates } from "./mandates";
import { agents } from "./agents";

export const purchaseRequestStatus = pgEnum("purchase_request_status", [
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

export const purchaseRequests = pgTable("purchase_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Idempotency: agent-supplied key prevents double submission
  idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull().unique(),

  mandateId: uuid("mandate_id")
    .notNull()
    .references(() => mandates.id),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id),

  // What the agent asked for
  itemName: text("item_name").notNull(),
  itemDescription: text("item_description"),
  vendorName: text("vendor_name").notNull(),
  vendorId: text("vendor_id"), // Channel3 product/vendor identifier
  category: text("category"),
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  justification: text("justification").notNull(),

  // Channel3 product metadata
  productMetadata: jsonb("product_metadata"),
  // Semantic embedding of "itemName + itemDescription" for dedup
  itemEmbedding: text("item_embedding"),

  status: purchaseRequestStatus("status").notNull().default("REQUESTED"),

  // Timestamps for each state transition
  requestedAt: timestamp("requested_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  evaluatedAt: timestamp("evaluated_at", { withTimezone: true }),
  escalatedAt: timestamp("escalated_at", { withTimezone: true }),
  escalationExpiresAt: timestamp("escalation_expires_at", { withTimezone: true }),
  authorizedAt: timestamp("authorized_at", { withTimezone: true }),
  capturedAt: timestamp("captured_at", { withTimezone: true }),
  voidedAt: timestamp("voided_at", { withTimezone: true }),
});

export type PurchaseRequest = typeof purchaseRequests.$inferSelect;
export type NewPurchaseRequest = typeof purchaseRequests.$inferInsert;
