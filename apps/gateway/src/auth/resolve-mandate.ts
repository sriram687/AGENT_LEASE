/**
 * Agent Mandate Resolution
 *
 * Resolves a scoped agent API key to an Agent + Mandate pair.
 * The key is stored as a bcrypt hash; we compare by hashing the provided key.
 *
 * Zero-trust: every request is authenticated. No agent is implicitly trusted.
 */
import type { DB } from "@leash/db";
import { agents, mandates } from "@leash/db";
import { eq } from "drizzle-orm";
// TODO: import bcrypt or argon2 for key comparison

export async function resolveAgentMandate(
  apiKey: string,
  db: DB
): Promise<{ agent: typeof agents.$inferSelect; mandate: typeof mandates.$inferSelect }> {
  // TODO Day 2: Full implementation
  // 1. Extract prefix (first 8 chars) for indexed lookup
  // 2. Find all agents with that prefix (should be 1-2 max)
  // 3. bcrypt.compare(apiKey, agent.apiKeyHash) for each
  // 4. If match found, load the mandate for agent.id
  // 5. If mandate is revoked/expired, throw 403
  
  throw new Error("resolveAgentMandate: not yet implemented – wire up in Day 2");
}
