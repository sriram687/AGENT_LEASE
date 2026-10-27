import { describe, it, expect } from "vitest";
import {
  generateKeyPair,
  canonicalize,
  signPayload,
  verifySignature,
  computeEntryHash,
  verifyChain,
  GENESIS_HASH,
} from "./index.js";

describe("@leash/crypto Unit Tests", () => {
  it("canonicalize sorts JSON keys deterministically", () => {
    const objA = { z: 1, a: "test", m: [3, 2, 1] };
    const objB = { a: "test", m: [3, 2, 1], z: 1 };
    expect(canonicalize(objA)).toBe(canonicalize(objB));
    expect(canonicalize(objA)).toBe('{"a":"test","m":[3,2,1],"z":1}');
  });

  it("generateKeyPair and Ed25519 signature verification", () => {
    const keyPair = generateKeyPair();
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();

    const payload = { mandateId: "m-123", amountCents: 5000 };
    const signature = signPayload(keyPair.privateKey, payload);
    expect(typeof signature).toBe("string");

    const isValid = verifySignature(keyPair.publicKey, payload, signature);
    expect(isValid).toBe(true);

    const tampered = verifySignature(
      keyPair.publicKey,
      { ...payload, amountCents: 99999 },
      signature
    );
    expect(tampered).toBe(false);
  });

  it("hash-chaining and tamper detection", () => {
    const block1Payload = { type: "MANDATE_CREATED", budget: 1000 };
    const hash1 = computeEntryHash(GENESIS_HASH, block1Payload);
    expect(hash1).toHaveLength(64);

    const block2Payload = { type: "HOLD_AUTHORIZED", amount: 45 };
    const hash2 = computeEntryHash(hash1, block2Payload);
    expect(hash2).toHaveLength(64);

    const chain = [
      { previousHash: GENESIS_HASH, entryHash: hash1, payload: block1Payload },
      { previousHash: hash1, entryHash: hash2, payload: block2Payload },
    ];

    const result = verifyChain(chain);
    expect(result.valid).toBe(true);

    // Tamper with block 1 payload
    const tamperedChain = [
      { previousHash: GENESIS_HASH, entryHash: hash1, payload: { ...block1Payload, budget: 9999 } },
      { previousHash: hash1, entryHash: hash2, payload: block2Payload },
    ];
    const tamperedResult = verifyChain(tamperedChain);
    expect(tamperedResult.valid).toBe(false);
    expect(tamperedResult.brokenAtIndex).toBe(0);
  });
});
