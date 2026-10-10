import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  varchar,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";

export const ledgerEntryType = pgEnum("ledger_entry_type", [
  "REQUEST_RECEIVED",
  "DECISION_MADE",
  "ESCALATION_CREATED",
  "ESCALATION_RESOLVED",
  "PAYMENT_AUTHORIZED",
  "PAYMENT_REAUTHORIZED",
  "PAYMENT_CAPTURED",
  "PAYMENT_VOIDED",
  "PAYMENT_REFUNDED",
  "DELIVERY_CONFIRMED",
  "MANDATE_CREATED",
  "MANDATE_UPDATED",
  "MANDATE_REVOKED",
  "KILL_SWITCH_ACTIVATED",
]);

/**
 * Append-only, hash-chained ledger.
 *
 * Each entry stores SHA-256(previousHash || canonicalPayload).
 * The first entry uses a genesis hash of all zeros.
 * Any tampered entry breaks the chain and is detectable.
 */
export const ledgerEntries = pgTable("ledger_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Monotonically increasing sequence for ordering (cannot rely on UUIDs)
  sequence: integer("sequence").notNull(), // set by application with row-level lock
  mandateId: uuid("mandate_id").notNull(),

  entryType: ledgerEntryType("entry_type").notNull(),

  // Entity reference
  entityType: varchar("entity_type", { length: 64 }).notNull(),
  entityId: uuid("entity_id").notNull(),

  // Canonical JSON payload that was hashed
  payload: jsonb("payload").notNull(),

  // Hash chain
  previousHash: varchar("previous_hash", { length: 64 }).notNull(),
  entryHash: varchar("entry_hash", { length: 64 }).notNull(),

  // Actor that caused this entry (agent ID, user ID, or "system")
  actorType: varchar("actor_type", { length: 32 }).notNull(),
  actorId: text("actor_id").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type NewLedgerEntry = typeof ledgerEntries.$inferInsert;
