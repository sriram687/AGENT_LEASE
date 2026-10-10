import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
  varchar,
} from "drizzle-orm/pg-core";
import { purchaseRequests } from "./purchase-requests.js";

export const paymentRecordStatus = pgEnum("payment_record_status", [
  "AUTHORIZED",
  "REAUTHORIZED",
  "CAPTURED",
  "VOIDED",
  "REFUNDED",
  "FAILED",
]);

export const paymentRecords = pgTable("payment_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  purchaseRequestId: uuid("purchase_request_id")
    .notNull()
    .references(() => purchaseRequests.id, { onDelete: "cascade" }),

  // PayPal identifiers
  paypalOrderId: varchar("paypal_order_id", { length: 64 }).notNull(),
  paypalAuthorizationId: varchar("paypal_authorization_id", { length: 64 }),
  paypalCaptureId: varchar("paypal_capture_id", { length: 64 }),
  paypalRequestId: varchar("paypal_request_id", { length: 64 }).notNull(), // idempotency key

  status: paymentRecordStatus("status").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),

  // Authorization lifecycle
  authorizedAt: timestamp("authorized_at", { withTimezone: true }),
  // Honor period boundary (day 3) and expiry (day 29)
  honorPeriodEndsAt: timestamp("honor_period_ends_at", { withTimezone: true }),
  authorizationExpiresAt: timestamp("authorization_expires_at", { withTimezone: true }),
  // Set when Render Workflows schedules the reauth check
  reauthorizeJobId: text("reauthorize_job_id"),

  capturedAt: timestamp("captured_at", { withTimezone: true }),
  voidedAt: timestamp("voided_at", { withTimezone: true }),

  // Raw PayPal API response snapshots (for reconciliation and debugging)
  rawOrderSnapshot: text("raw_order_snapshot"),
  rawCaptureSnapshot: text("raw_capture_snapshot"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type NewPaymentRecord = typeof paymentRecords.$inferInsert;
