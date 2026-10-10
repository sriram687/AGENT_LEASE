import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { purchaseRequests } from "./purchase-requests.js";
import { users } from "./users.js";

export const escalationStatus = pgEnum("escalation_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
]);

export const escalations = pgTable("escalations", {
  id: uuid("id").primaryKey().defaultRandom(),
  purchaseRequestId: uuid("purchase_request_id")
    .notNull()
    .unique()
    .references(() => purchaseRequests.id, { onDelete: "cascade" }),

  // Which human reviewed it (null until actioned)
  reviewedById: uuid("reviewed_by_id").references(() => users.id),

  status: escalationStatus("status").notNull().default("PENDING"),

  // Leash's reasoning shown to the human in the cockpit
  leashReasoning: text("leash_reasoning").notNull(),

  // Human's comment when approving or rejecting
  humanComment: text("human_comment"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export type Escalation = typeof escalations.$inferSelect;
export type NewEscalation = typeof escalations.$inferInsert;
