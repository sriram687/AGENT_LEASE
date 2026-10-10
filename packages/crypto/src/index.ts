/**
 * @leash/crypto
 *
 * Cryptographic primitives for Agent Leash.
 * Uses Node.js built-in `crypto` (Ed25519) – no external deps needed.
 *
 * Responsibilities:
 *  1. Key pair generation for users (mandate signing)
 *  2. Mandate signing: sign canonical JSON representation of a mandate
 *  3. Decision receipt signing: sign decision output as non-repudiable proof
 *  4. Hash-chaining: SHA-256(previousHash || canonicalPayload) for ledger
 *  5. Verification: verify signatures and ledger chain integrity
 */
import { createHash, generateKeyPairSync, sign, verify } from "node:crypto";

// ──────────────────────────────────────────────────────────
// Key management
// ──────────────────────────────────────────────────────────

export interface KeyPair {
  publicKey: string; // hex-encoded DER
  privateKey: string; // hex-encoded DER (keep secret, never store in DB)
}

export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "der" },
  });
  return {
    publicKey: publicKey.toString("hex"),
    privateKey: privateKey.toString("hex"),
  };
}

// ──────────────────────────────────────────────────────────
// Canonical JSON serialization (deterministic key ordering)
// ──────────────────────────────────────────────────────────

export function canonicalize(obj: unknown): string {
  return JSON.stringify(sortKeys(obj));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])])
    );
  }
  return value;
}

// ──────────────────────────────────────────────────────────
// Signing
// ──────────────────────────────────────────────────────────

export function signPayload(privateKeyHex: string, payload: unknown): string {
  const privateKeyDer = Buffer.from(privateKeyHex, "hex");
  const canonical = canonicalize(payload);
  const sig = sign(null, Buffer.from(canonical, "utf8"), {
    key: privateKeyDer,
    format: "der",
    type: "pkcs8",
    dsaEncoding: "der",
  });
  return sig.toString("base64url");
}

export function verifySignature(
  publicKeyHex: string,
  payload: unknown,
  signatureBase64url: string
): boolean {
  try {
    const publicKeyDer = Buffer.from(publicKeyHex, "hex");
    const canonical = canonicalize(payload);
    return verify(
      null,
      Buffer.from(canonical, "utf8"),
      {
        key: publicKeyDer,
        format: "der",
        type: "spki",
        dsaEncoding: "der",
      },
      Buffer.from(signatureBase64url, "base64url")
    );
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────────────────
// Ledger hash-chaining
// ──────────────────────────────────────────────────────────

export const GENESIS_HASH = "0".repeat(64);

export function computeEntryHash(
  previousHash: string,
  payload: unknown
): string {
  const canonical = canonicalize(payload);
  return createHash("sha256")
    .update(previousHash)
    .update(canonical)
    .digest("hex");
}

export function verifyChain(
  entries: Array<{ previousHash: string; entryHash: string; payload: unknown }>
): { valid: boolean; brokenAtIndex?: number } {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const expected = computeEntryHash(entry.previousHash, entry.payload);
    if (expected !== entry.entryHash) {
      return { valid: false, brokenAtIndex: i };
    }
    if (i > 0) {
      const prev = entries[i - 1]!;
      if (entry.previousHash !== prev.entryHash) {
        return { valid: false, brokenAtIndex: i };
      }
    } else {
      if (entry.previousHash !== GENESIS_HASH) {
        return { valid: false, brokenAtIndex: 0 };
      }
    }
  }
  return { valid: true };
}

// ──────────────────────────────────────────────────────────
// Mandate signing helpers
// ──────────────────────────────────────────────────────────

/**
 * Canonical mandate payload for signing.
 * Includes only the policy fields (not DB metadata like createdAt).
 */
export function getMandateSigningPayload(mandate: {
  id: string;
  purpose: string;
  totalBudgetCents: number;
  perPurchaseCapCents: number;
  escalateAboveCents: number;
  allowedCategories: string[];
  merchantAllowlist: string[];
  captureMode: string;
  expiresAt: string | null;
}) {
  return {
    id: mandate.id,
    purpose: mandate.purpose,
    totalBudgetCents: mandate.totalBudgetCents,
    perPurchaseCapCents: mandate.perPurchaseCapCents,
    escalateAboveCents: mandate.escalateAboveCents,
    allowedCategories: [...mandate.allowedCategories].sort(),
    merchantAllowlist: [...mandate.merchantAllowlist].sort(),
    captureMode: mandate.captureMode,
    expiresAt: mandate.expiresAt,
  };
}
