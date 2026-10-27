/**
 * @leash/ledger
 *
 * Immutable append-only audit ledger primitives.
 * Hash-chained using SHA-256(previousHash || canonicalPayload).
 */
import {
  computeEntryHash,
  verifyChain,
  GENESIS_HASH,
} from "@leash/crypto";

export interface LedgerBlock<T = Record<string, unknown>> {
  sequence: number;
  mandateId: string;
  entryType: string;
  entityType: string;
  entityId: string;
  payload: T;
  previousHash: string;
  entryHash: string;
  actorType: "agent" | "operator" | "system";
  actorId: string;
  timestamp: string;
}

export class MemoryLedger {
  private blocks: LedgerBlock[] = [];

  append<T extends Record<string, unknown>>(params: {
    mandateId: string;
    entryType: string;
    entityType: string;
    entityId: string;
    payload: T;
    actorType: "agent" | "operator" | "system";
    actorId: string;
  }): LedgerBlock<T> {
    const sequence = this.blocks.length + 1;
    const previousHash =
      this.blocks.length > 0
        ? this.blocks[this.blocks.length - 1]!.entryHash
        : GENESIS_HASH;

    const entryHash = computeEntryHash(previousHash, params.payload);
    const block: LedgerBlock<T> = {
      ...params,
      sequence,
      previousHash,
      entryHash,
      timestamp: new Date().toISOString(),
    };

    this.blocks.push(block as LedgerBlock);
    return block;
  }

  getChain(): LedgerBlock[] {
    return [...this.blocks];
  }

  verify(): { valid: boolean; brokenAtIndex?: number } {
    return verifyChain(this.blocks);
  }
}

export { computeEntryHash, verifyChain, GENESIS_HASH };
