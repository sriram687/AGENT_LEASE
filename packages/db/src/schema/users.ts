import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "viewer"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("owner"),
  // Ed25519 public key for mandate signing verification (hex-encoded)
  publicKey: text("public_key"),
  // PayPal Vault ID - set after the user completes the consent flow
  vaultId: text("vault_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
