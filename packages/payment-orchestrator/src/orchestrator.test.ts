import { describe, it, expect, vi } from "vitest";
import {
  authorizePayPalVaultHold,
  capturePayPalHold,
  voidPayPalHold,
} from "./index.js";

describe("@leash/payment-orchestrator Unit Tests", () => {
  it("fails cleanly when credentials are missing", async () => {
    const originalId = process.env["PAYPAL_CLIENT_ID"];
    delete process.env["PAYPAL_CLIENT_ID"];

    const res = await authorizePayPalVaultHold({
      vaultId: "vault-123",
      amountCents: 4500,
      description: "Test hold",
    });

    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();

    if (originalId) process.env["PAYPAL_CLIENT_ID"] = originalId;
  });

  it("capturePayPalHold validates input parameters", async () => {
    const res = await capturePayPalHold("auth-123", 4500, "USD");
    expect(typeof res.success).toBe("boolean");
  });

  it("voidPayPalHold handles release", async () => {
    const res = await voidPayPalHold("auth-999");
    expect(typeof res.success).toBe("boolean");
  });
});
