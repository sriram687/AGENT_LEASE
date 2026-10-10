/**
 * Ledger Service (App Layer)
 *
 * Wraps the @leash/ledger package with application context.
 * All writes are append-only and hash-chained.
 */
import type { DB } from "@leash/db";
import type { LedgerEntryType } from "@leash/db";

export class LedgerService {
  constructor(private readonly db: DB) {}

  async append(entry: {
    mandateId: string;
    entryType: string;
    entityType: string;
    entityId: string;
    payload: unknown;
    actorType: string;
    actorId: string;
  }) {
    // TODO Day 2: Full implementation
    // 1. Lock ledger sequence row for this mandateId
    // 2. Get last entry's hash (or GENESIS_HASH if first)
    // 3. Compute new hash = SHA-256(previousHash + canonicalize(payload))
    // 4. Insert new ledger entry with computed hash
    // 5. All inside a DB transaction
    console.log(`TODO: append ledger entry type=${entry.entryType}`);
  }

  async verify(mandateId: string): Promise<{ valid: boolean; brokenAtIndex?: number }> {
    // TODO: Load all entries for mandateId ordered by sequence, verify chain
    return { valid: true };
  }
}
