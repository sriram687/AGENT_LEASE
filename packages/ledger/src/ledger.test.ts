import { describe, it, expect } from "vitest";
import { MemoryLedger, GENESIS_HASH } from "./index.js";

describe("@leash/ledger Unit Tests", () => {
  it("appends blocks with valid hash chain", () => {
    const ledger = new MemoryLedger();
    const block1 = ledger.append({
      mandateId: "m-1",
      entryType: "MANDATE_CREATED",
      entityType: "mandate",
      entityId: "m-1",
      payload: { budgetCents: 100000 },
      actorType: "operator",
      actorId: "usr-1",
    });

    expect(block1.sequence).toBe(1);
    expect(block1.previousHash).toBe(GENESIS_HASH);
    expect(block1.entryHash).toHaveLength(64);

    const block2 = ledger.append({
      mandateId: "m-1",
      entryType: "PAYMENT_AUTHORIZED",
      entityType: "payment",
      entityId: "pay-1",
      payload: { amountCents: 4500 },
      actorType: "agent",
      actorId: "agt-1",
    });

    expect(block2.sequence).toBe(2);
    expect(block2.previousHash).toBe(block1.entryHash);

    const verification = ledger.verify();
    expect(verification.valid).toBe(true);
  });
});
