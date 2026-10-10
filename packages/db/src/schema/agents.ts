import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // bcrypt hash of the scoped API key
  apiKeyHash: varchar("api_key_hash", { length: 255 }).notNull(),
  // The first 8 chars of the key, shown in the cockpit for identification
  apiKeyPrefix: varchar("api_key_prefix", { length: 8 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
});

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
