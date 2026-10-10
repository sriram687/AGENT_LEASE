import {
  pgTable,
  uuid,
  text,
  varchar,
  numeric,
  integer,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { agents } from "./agents.js";

export const captureMode = pgEnum("capture_mode", [
  "immediate",
  "on_delivery",
]);

export const mandateStatus = pgEnum("mandate_status", [
  "active",
  "suspended",
  "revoked",
  "expired",
]);

export const mandates = pgTable("mandates", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id")
    .notNull()
    .unique()
    .references(() => agents.id, { onDelete: "cascade" }),

  // Purpose – the canonical statement the LLM judge compares against
  purpose: text("purpose").notNull(),
  purposeEmbedding: text("purpose_embedding"), // pgvector: stored as JSON for now, col type set in migration

  // Budget controls
  totalBudgetCents: integer("total_budget_cents").notNull(),
  spentCents: integer("spent_cents").notNull().default(0),
  reservedCents: integer("reserved_cents").notNull().default(0), // held in open authorizations
  perPurchaseCapCents: integer("per_purchase_cap_cents").notNull(),
  escalateAboveCents: integer("escalate_above_cents").notNull(),

  // Category / merchant controls (stored as JSONB arrays)
  allowedCategories: jsonb("allowed_categories").$type<string[]>().notNull().default([]),
  merchantAllowlist: jsonb("merchant_allowlist").$type<string[]>().notNull().default([]),

  // Velocity
  maxPurchasesPerDay: integer("max_purchases_per_day").notNull().default(10),
  velocityWindowHours: integer("velocity_window_hours").notNull().default(24),

  // Semantic deduplication
  allowReroute: boolean("allow_reroute").notNull().default(false),
  dedupSimilarityThreshold: numeric("dedup_similarity_threshold", {
    precision: 4,
    scale: 3,
  })
    .notNull()
    .default("0.85"),
  clusterBudgetCapCents: integer("cluster_budget_cap_cents"), // max total for items in same cluster

  // Fulfillment
  captureMode: captureMode("capture_mode").notNull().default("on_delivery"),
  deliverySlaHours: integer("delivery_sla_hours").notNull().default(72),
  reauthorizeBeforeHours: integer("reauthorize_before_hours").notNull().default(24),

  // Lifecycle
  status: mandateStatus("status").notNull().default("active"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),

  // Cryptographic integrity: the user's Ed25519 signature over a canonical JSON of this mandate
  ownerSignature: text("owner_signature"),
  signedAt: timestamp("signed_at", { withTimezone: true }),
});

export type Mandate = typeof mandates.$inferSelect;
export type NewMandate = typeof mandates.$inferInsert;
