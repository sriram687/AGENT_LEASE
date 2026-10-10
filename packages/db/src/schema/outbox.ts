import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  jsonb,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

export const outboxStatus = pgEnum("outbox_status", [
  "PENDING",
  "PROCESSING",
  "DONE",
  "FAILED",
]);

/**
 * Transactional Outbox pattern.
 *
 * Events are written in the SAME database transaction as the state change.
 * A background poller (or BullMQ) picks them up and publishes to the queue.
 * This guarantees at-least-once delivery without distributed transactions.
 */
export const outbox = pgTable("outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  aggregateType: text("aggregate_type").notNull(), // e.g. "purchase_request"
  aggregateId: uuid("aggregate_id").notNull(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),

  status: outboxStatus("status").notNull().default("PENDING"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  // BullMQ job ID for tracking
  jobId: text("job_id"),
  processed: boolean("processed").notNull().default(false),
});

export type Outbox = typeof outbox.$inferSelect;
export type NewOutbox = typeof outbox.$inferInsert;
