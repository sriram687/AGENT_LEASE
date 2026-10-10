import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

// Connection pool – max 10 connections, suitable for Render Postgres
const connectionString = process.env["DATABASE_URL"];
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const queryClient = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });

export type DB = typeof db;

// Re-export schema for consumers
export * from "./schema/index.js";
