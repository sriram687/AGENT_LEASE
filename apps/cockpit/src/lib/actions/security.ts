"use server";

import { db, mandates } from "@leash/db";
import { eq } from "drizzle-orm";
import { PolicyEngine } from "@leash/policy-engine";
import { randomUUID } from "node:crypto";
import type { RequestPurchaseInput } from "@leash/types";

const policyEngine = new PolicyEngine(db);

export interface AttackSimulationInput {
  attackType: "injection" | "structuring" | "mcc_violation" | "over_cap" | "custom";
  itemName: string;
  vendorName: string;
  category: string;
  amountCents: number;
  justification: string;
}

export interface AttackSimulationResult {
  success: boolean;
  verdict: "APPROVED" | "ESCALATED" | "DENIED";
  plainReason: string;
  latencyMs: number;
  injectionDetected: boolean;
  failedRules: string[];
  rulesSummary: {
    budgetOk: boolean;
    capOk: boolean;
    categoryOk: boolean;
    merchantOk: boolean;
    velocityOk: boolean;
  };
}

export async function runSecuritySimulation(
  input: AttackSimulationInput
): Promise<AttackSimulationResult> {
  const startTime = Date.now();
  try {
    // 1. Fetch any active mandate to test against
    let [mandate] = await db
      .select()
      .from(mandates)
      .where(eq(mandates.status, "active"))
      .limit(1);

    if (!mandate) {
      const [fallback] = await db.select().from(mandates).limit(1);
      mandate = fallback;
    }

    if (!mandate) {
      return {
        success: false,
        verdict: "DENIED",
        plainReason: "No mandate available in database to test.",
        latencyMs: Date.now() - startTime,
        injectionDetected: false,
        failedRules: ["no_mandate"],
        rulesSummary: {
          budgetOk: false,
          capOk: false,
          categoryOk: false,
          merchantOk: false,
          velocityOk: false,
        },
      };
    }

    // 2. Prepare purchase input
    const reqInput: RequestPurchaseInput = {
      itemName: input.itemName,
      vendorName: input.vendorName,
      category: input.category,
      amountCents: input.amountCents,
      currency: "USD",
      justification: input.justification,
      idempotencyKey: randomUUID(),
    };

    // 3. Evaluate through 4-layer Policy Engine
    const decision = await policyEngine.evaluate(reqInput, mandate);
    const latencyMs = Date.now() - startTime;

    return {
      success: true,
      verdict: decision.verdict,
      plainReason: decision.plainReason,
      latencyMs,
      injectionDetected: decision.injectionDetected ?? false,
      failedRules: decision.ruleResults?.failedRules ?? [],
      rulesSummary: {
        budgetOk: decision.ruleResults?.budgetOk ?? false,
        capOk: decision.ruleResults?.capOk ?? false,
        categoryOk: decision.ruleResults?.categoryOk ?? false,
        merchantOk: decision.ruleResults?.merchantOk ?? false,
        velocityOk: decision.ruleResults?.velocityOk ?? false,
      },
    };
  } catch (error: any) {
    console.error("[runSecuritySimulation] error:", error);
    return {
      success: false,
      verdict: "DENIED",
      plainReason: `Evaluation failed: ${error.message}`,
      latencyMs: Date.now() - startTime,
      injectionDetected: false,
      failedRules: ["internal_error"],
      rulesSummary: {
        budgetOk: false,
        capOk: false,
        categoryOk: false,
        merchantOk: false,
        velocityOk: false,
      },
    };
  }
}
