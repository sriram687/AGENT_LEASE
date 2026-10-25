import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

// Lazy singleton — only connects when first used, safe for Next.js bundling
let _db: PostgresJsDatabase<typeof schema> | null = null;

function getDb() {
  if (_db) return _db;
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const queryClient = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  _db = drizzle(queryClient, { schema });
  return _db;
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

export type DB = typeof db;

// Re-export schema and drizzle-orm primitives for consumers
export * from "./schema/index";
export * from "drizzle-orm";
