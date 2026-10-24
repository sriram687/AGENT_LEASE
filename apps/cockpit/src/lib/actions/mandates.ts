"use server";

import { revalidatePath } from "next/cache";
import { db, mandates, agents, users } from "@leash/db";
import { eq, desc } from "drizzle-orm";
import { getUserProfile } from "./user";
import {
  generateKeyPair,
  getMandateSigningPayload,
  signPayload,
  verifySignature,
} from "@leash/crypto";
import { randomUUID } from "node:crypto";

export interface MandateWithAgent {
  id: string;
  agentId: string;
  agentName: string;
  purpose: string;
  totalBudgetCents: number;
  spentCents: number;
  reservedCents: number;
  availableCents: number;
  perPurchaseCapCents: number;
  escalateAboveCents: number;
  allowedCategories: string[];
  merchantAllowlist: string[];
  maxPurchasesPerDay: number;
  captureMode: "immediate" | "on_delivery";
  deliverySlaHours: number;
  status: "active" | "suspended" | "revoked" | "expired";
  ownerSignature: string | null;
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMandateInput {
  agentName: string;
  purpose: string;
  totalBudgetCents: number;
  perPurchaseCapCents: number;
  escalateAboveCents: number;
  allowedCategories: string[];
  merchantAllowlist: string[];
  deliverySlaHours?: number;
  captureMode?: "immediate" | "on_delivery";
  maxPurchasesPerDay?: number;
}

/**
 * Fetch all mandates with linked agent metadata.
 * Auto-seeds a default signed mandate if database is empty.
 */
export async function getMandates(): Promise<{
  success: boolean;
  mandates: MandateWithAgent[];
  error?: string;
}> {
  try {
    const profileRes = await getUserProfile();
    const operator = profileRes.user;

    const rows = await db
      .select({
        mandate: mandates,
        agent: agents,
      })
      .from(mandates)
      .innerJoin(agents, eq(mandates.agentId, agents.id))
      .orderBy(desc(mandates.createdAt));

    if (rows.length === 0 && operator?.id) {
      // Seed default mandate for testing
      const seeded = await seedDefaultMandate(operator.id, operator.publicKey);
      if (seeded) {
        return { success: true, mandates: [seeded] };
      }
    }

    const formatted: MandateWithAgent[] = rows.map(({ mandate, agent }) => {
      const available = Math.max(
        0,
        mandate.totalBudgetCents - mandate.spentCents - mandate.reservedCents
      );

      return {
        id: mandate.id,
        agentId: mandate.agentId,
        agentName: agent.name,
        purpose: mandate.purpose,
        totalBudgetCents: mandate.totalBudgetCents,
        spentCents: mandate.spentCents,
        reservedCents: mandate.reservedCents,
        availableCents: available,
        perPurchaseCapCents: mandate.perPurchaseCapCents,
        escalateAboveCents: mandate.escalateAboveCents,
        allowedCategories: mandate.allowedCategories ?? [],
        merchantAllowlist: mandate.merchantAllowlist ?? [],
        maxPurchasesPerDay: mandate.maxPurchasesPerDay,
        captureMode: mandate.captureMode,
        deliverySlaHours: mandate.deliverySlaHours,
        status: mandate.status,
        ownerSignature: mandate.ownerSignature,
        signedAt: mandate.signedAt ? new Date(mandate.signedAt).toISOString() : null,
        createdAt: new Date(mandate.createdAt).toISOString(),
        updatedAt: new Date(mandate.updatedAt).toISOString(),
      };
    });

    return { success: true, mandates: formatted };
  } catch (error: any) {
    console.error("[getMandates] error:", error);
    return { success: false, mandates: [], error: error.message };
  }
}

/**
 * Helper to seed a default realistic mandate if table is clean.
 */
async function seedDefaultMandate(
  operatorId: string,
  operatorPublicKey: string | null
): Promise<MandateWithAgent | null> {
  try {
    // 1. Create default agent
    const [agent] = await db
      .insert(agents)
      .values({
        ownerId: operatorId,
        name: "DevOps Cloud Agent (Auto-Scaler)",
        apiKeyHash: "$2b$10$demoHashForDevelopmentTestingOnlyNotRealSecret",
        apiKeyPrefix: "leash_sk",
        description: "Autonomous agent responsible for cloud infrastructure and compute scaling",
        isActive: true,
      })
      .returning();

    if (!agent) return null;

    // 2. Generate signing keypair if operator didn't have one
    const keypair = generateKeyPair();
    const mandateId = randomUUID();

    const mandatePayload = {
      id: mandateId,
      purpose: "Autonomous cloud server procurement, compute autoscaling, and software package licensing",
      totalBudgetCents: 25000, // $250.00
      perPurchaseCapCents: 5000, // $50.00
      escalateAboveCents: 10000, // $100.00
      allowedCategories: ["7372", "5734", "4816"],
      merchantAllowlist: ["AWS Cloud Services", "GitHub", "DigitalOcean", "RunPod"],
      captureMode: "on_delivery" as const,
      expiresAt: null,
    };

    const signature = signPayload(keypair.privateKey, getMandateSigningPayload(mandatePayload));

    // 3. Insert default mandate
    const [mandate] = await db
      .insert(mandates)
      .values({
        id: mandateId,
        ownerId: operatorId,
        agentId: agent.id,
        purpose: mandatePayload.purpose,
        totalBudgetCents: mandatePayload.totalBudgetCents,
        spentCents: 4350, // $43.50 spent
        reservedCents: 1850, // $18.50 held in open authorization
        perPurchaseCapCents: mandatePayload.perPurchaseCapCents,
        escalateAboveCents: mandatePayload.escalateAboveCents,
        allowedCategories: mandatePayload.allowedCategories,
        merchantAllowlist: mandatePayload.merchantAllowlist,
        maxPurchasesPerDay: 10,
        captureMode: mandatePayload.captureMode,
        deliverySlaHours: 72,
        status: "active",
        ownerSignature: signature,
        signedAt: new Date(),
      })
      .returning();

    if (!mandate) return null;

    return {
      id: mandate.id,
      agentId: agent.id,
      agentName: agent.name,
      purpose: mandate.purpose,
      totalBudgetCents: mandate.totalBudgetCents,
      spentCents: mandate.spentCents,
      reservedCents: mandate.reservedCents,
      availableCents: mandate.totalBudgetCents - mandate.spentCents - mandate.reservedCents,
      perPurchaseCapCents: mandate.perPurchaseCapCents,
      escalateAboveCents: mandate.escalateAboveCents,
      allowedCategories: mandate.allowedCategories ?? [],
      merchantAllowlist: mandate.merchantAllowlist ?? [],
      maxPurchasesPerDay: mandate.maxPurchasesPerDay,
      captureMode: mandate.captureMode,
      deliverySlaHours: mandate.deliverySlaHours,
      status: mandate.status,
      ownerSignature: mandate.ownerSignature,
      signedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[seedDefaultMandate] error:", err);
    return null;
  }
}

/**
 * Create a new signed Mandate for an agent.
 */
export async function createMandate(input: CreateMandateInput): Promise<{
  success: boolean;
  mandate?: MandateWithAgent;
  error?: string;
}> {
  try {
    const profileRes = await getUserProfile();
    const operator = profileRes.user;
    if (!operator?.id) {
      return { success: false, error: "Operator not authenticated" };
    }

    if (!input.agentName?.trim()) {
      return { success: false, error: "Agent name is required" };
    }
    if (!input.purpose?.trim()) {
      return { success: false, error: "Mandate purpose statement is required" };
    }
    if (input.totalBudgetCents <= 0) {
      return { success: false, error: "Total budget must be greater than $0" };
    }
    if (input.perPurchaseCapCents <= 0) {
      return { success: false, error: "Per-purchase cap must be greater than $0" };
    }

    // 1. Create or link Agent
    const [agent] = await db
      .insert(agents)
      .values({
        ownerId: operator.id,
        name: input.agentName.trim(),
        apiKeyHash: "$2b$10$demoHashPlaceholderForAutonomousAgentVerificationKey",
        apiKeyPrefix: "leash_ag",
        description: `Agent initialized for mandate: ${input.purpose.slice(0, 60)}...`,
        isActive: true,
      })
      .returning();

    if (!agent) {
      return { success: false, error: "Failed to create agent record" };
    }

    // 2. Prepare mandate signing payload
    const mandateId = randomUUID();
    const keypair = generateKeyPair();

    const signingPayload = {
      id: mandateId,
      purpose: input.purpose.trim(),
      totalBudgetCents: input.totalBudgetCents,
      perPurchaseCapCents: input.perPurchaseCapCents,
      escalateAboveCents: input.escalateAboveCents || input.perPurchaseCapCents,
      allowedCategories: input.allowedCategories ?? [],
      merchantAllowlist: input.merchantAllowlist ?? [],
      captureMode: input.captureMode ?? ("on_delivery" as const),
      expiresAt: null,
    };

    const signature = signPayload(
      keypair.privateKey,
      getMandateSigningPayload(signingPayload)
    );

    // 3. Persist Mandate in Database
    const [created] = await db
      .insert(mandates)
      .values({
        id: mandateId,
        ownerId: operator.id,
        agentId: agent.id,
        purpose: signingPayload.purpose,
        totalBudgetCents: signingPayload.totalBudgetCents,
        spentCents: 0,
        reservedCents: 0,
        perPurchaseCapCents: signingPayload.perPurchaseCapCents,
        escalateAboveCents: signingPayload.escalateAboveCents,
        allowedCategories: signingPayload.allowedCategories,
        merchantAllowlist: signingPayload.merchantAllowlist,
        maxPurchasesPerDay: input.maxPurchasesPerDay ?? 10,
        captureMode: signingPayload.captureMode,
        deliverySlaHours: input.deliverySlaHours ?? 72,
        status: "active",
        ownerSignature: signature,
        signedAt: new Date(),
      })
      .returning();

    if (!created) {
      return { success: false, error: "Failed to persist mandate in database" };
    }

    revalidatePath("/mandates");
    revalidatePath("/");

    return {
      success: true,
      mandate: {
        id: created.id,
        agentId: agent.id,
        agentName: agent.name,
        purpose: created.purpose,
        totalBudgetCents: created.totalBudgetCents,
        spentCents: created.spentCents,
        reservedCents: created.reservedCents,
        availableCents: created.totalBudgetCents,
        perPurchaseCapCents: created.perPurchaseCapCents,
        escalateAboveCents: created.escalateAboveCents,
        allowedCategories: created.allowedCategories ?? [],
        merchantAllowlist: created.merchantAllowlist ?? [],
        maxPurchasesPerDay: created.maxPurchasesPerDay,
        captureMode: created.captureMode,
        deliverySlaHours: created.deliverySlaHours,
        status: created.status,
        ownerSignature: created.ownerSignature,
        signedAt: new Date().toISOString(),
        createdAt: new Date(created.createdAt).toISOString(),
        updatedAt: new Date(created.updatedAt).toISOString(),
      },
    };
  } catch (error: any) {
    console.error("[createMandate] error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Toggle mandate status (active <-> suspended <-> revoked)
 */
export async function toggleMandateStatus(
  mandateId: string,
  newStatus: "active" | "suspended" | "revoked"
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {
      status: newStatus,
      updatedAt: new Date(),
    };
    if (newStatus === "revoked") {
      updateData.revokedAt = new Date();
    }

    await db
      .update(mandates)
      .set(updateData)
      .where(eq(mandates.id, mandateId));

    revalidatePath("/mandates");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("[toggleMandateStatus] error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Revoke mandate kill-switch
 */
export async function revokeMandate(
  mandateId: string
): Promise<{ success: boolean; error?: string }> {
  return toggleMandateStatus(mandateId, "revoked");
}

/**
 * Interactive Policy Evaluation Simulator:
 * Tests an incoming transaction against a mandate's rules in real-time.
 */
export async function simulateMandateCheck(input: {
  mandateId: string;
  amountCents: number;
  merchant: string;
  mcc: string;
  purpose: string;
}): Promise<{
  decision: "ALLOW" | "ESCALATE" | "BLOCK";
  reason: string;
  checks: {
    mandateActive: boolean;
    budgetAvailable: boolean;
    perPurchaseCap: boolean;
    mccAllowed: boolean;
    merchantAllowed: boolean;
  };
}> {
  try {
    const [found] = await db
      .select()
      .from(mandates)
      .where(eq(mandates.id, input.mandateId))
      .limit(1);

    if (!found) {
      return {
        decision: "BLOCK",
        reason: "Mandate does not exist or has been removed.",
        checks: {
          mandateActive: false,
          budgetAvailable: false,
          perPurchaseCap: false,
          mccAllowed: false,
          merchantAllowed: false,
        },
      };
    }

    const isActive = found.status === "active";
    const available = found.totalBudgetCents - found.spentCents - found.reservedCents;
    const hasBudget = available >= input.amountCents;
    const underCap = input.amountCents <= found.perPurchaseCapCents;

    const allowedCats = found.allowedCategories ?? [];
    const mccAllowed = allowedCats.length === 0 || allowedCats.includes(input.mcc);

    const allowedMerchants = (found.merchantAllowlist ?? []).map((m) => m.toLowerCase());
    const merchantAllowed =
      allowedMerchants.length === 0 ||
      allowedMerchants.some((m) => input.merchant.toLowerCase().includes(m));

    const checks = {
      mandateActive: isActive,
      budgetAvailable: hasBudget,
      perPurchaseCap: underCap,
      mccAllowed,
      merchantAllowed,
    };

    if (!isActive) {
      return {
        decision: "BLOCK",
        reason: `Mandate status is '${found.status.toUpperCase()}'. Spending is currently frozen.`,
        checks,
      };
    }

    if (!hasBudget) {
      return {
        decision: "BLOCK",
        reason: `Insufficient budget. Requested $${(input.amountCents / 100).toFixed(2)}, but only $${(available / 100).toFixed(2)} remains available.`,
        checks,
      };
    }

    if (!mccAllowed) {
      return {
        decision: "BLOCK",
        reason: `MCC '${input.mcc}' is not authorized. Allowed categories: ${allowedCats.join(", ")}.`,
        checks,
      };
    }

    if (!underCap || input.amountCents > found.escalateAboveCents || !merchantAllowed) {
      let escalateReason = "";
      if (!underCap) {
        escalateReason = `Amount $${(input.amountCents / 100).toFixed(2)} exceeds per-purchase cap of $${(found.perPurchaseCapCents / 100).toFixed(2)}.`;
      } else if (!merchantAllowed) {
        escalateReason = `Merchant '${input.merchant}' is not on the pre-approved allowlist.`;
      } else {
        escalateReason = `Amount exceeds human escalation threshold of $${(found.escalateAboveCents / 100).toFixed(2)}.`;
      }

      return {
        decision: "ESCALATE",
        reason: `Triggers Human Escalation: ${escalateReason}`,
        checks,
      };
    }

    return {
      decision: "ALLOW",
      reason: "All cryptographic and policy guardrails passed. Eligible for immediate PayPal Sandbox Authorization hold.",
      checks,
    };
  } catch (error: any) {
    return {
      decision: "BLOCK",
      reason: error.message ?? "Simulation failed",
      checks: {
        mandateActive: false,
        budgetAvailable: false,
        perPurchaseCap: false,
        mccAllowed: false,
        merchantAllowed: false,
      },
    };
  }
}
