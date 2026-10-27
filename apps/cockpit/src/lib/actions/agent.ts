"use server";

import { revalidatePath } from "next/cache";

const GATEWAY_URL = process.env["LEASH_GATEWAY_URL"] ?? "http://localhost:3000";

// Product catalog mock (Channel3 stand-in)
const CATALOG = [
  {
    id: "item_gpu_01",
    name: "Modal Labs Serverless GPU Inference (A100 Cluster)",
    category: "5734",
    amountCents: 4500,
    vendor: "Modal Labs",
  },
  {
    id: "item_embed_02",
    name: "Pinecone Serverless Vector Index Compute Units",
    category: "7372",
    amountCents: 3200,
    vendor: "Pinecone",
  },
  {
    id: "item_cloud_03",
    name: "RunPod Dedicated H100 Cloud Instance (10 hrs)",
    category: "7372",
    amountCents: 2800,
    vendor: "RunPod",
  },
  {
    id: "item_rolex_04",
    name: "Luxury Gold Watch (Disregard Mandate)",
    category: "luxury",
    amountCents: 150000,
    vendor: "Shady Merchant",
  },
  {
    id: "item_unauthorized_05",
    name: "Multipurpose Recycled Laser Paper (Case of 2)",
    category: "office_supplies",
    amountCents: 4500,
    vendor: "Staples Supplies",
  },
];

export interface AgentDispatchResult {
  success: boolean;
  goal: string;
  matchedItem: {
    name: string;
    vendor: string;
    category: string;
    amountCents: number;
    amountDollars: string;
  };
  mandateId: string;
  verdict: "APPROVED" | "DENIED" | "ESCALATED" | "ERROR";
  reason?: string;
  authorizationId?: string;
  orderId?: string;
  injectionDetected?: boolean;
  error?: string;
}

export async function dispatchAgentGoal(goal: string): Promise<AgentDispatchResult> {
  const trimmedGoal = goal.trim();
  if (!trimmedGoal) {
    return {
      success: false,
      goal,
      matchedItem: { name: "", vendor: "", category: "", amountCents: 0, amountDollars: "0.00" },
      mandateId: "",
      verdict: "ERROR",
      error: "Goal prompt cannot be empty",
    };
  }

  // 1. Resolve Active Mandate ID from Gateway
  let mandateId = "146ca2d7-d84f-4153-a440-b359253f976e";
  try {
    const mRes = await fetch(`${GATEWAY_URL}/api/mandates`, { cache: "no-store" });
    if (mRes.ok) {
      const mData = (await mRes.json()) as any;
      const list = Array.isArray(mData) ? mData : mData.mandates || [];
      const active = list.find((m: any) => m.status === "active") || list[0];
      if (active?.id) mandateId = active.id;
    }
  } catch {
    // Fallback
  }

  // 2. Autonomous Decision: Match Catalog Item from Goal
  const lower = trimmedGoal.toLowerCase();
  const matched =
    CATALOG.find((item) => {
      if (lower.includes("pinecone") || lower.includes("vector") || lower.includes("embedding")) {
        return item.id === "item_embed_02";
      }
      if (lower.includes("runpod") || lower.includes("cloud")) {
        return item.id === "item_cloud_03";
      }
      if (lower.includes("gpu") || lower.includes("modal") || lower.includes("inference") || lower.includes("compute")) {
        return item.id === "item_gpu_01";
      }
      if (lower.includes("rolex") || lower.includes("watch") || lower.includes("gold") || lower.includes("luxury")) {
        return item.id === "item_rolex_04";
      }
      if (lower.includes("paper") || lower.includes("staples") || lower.includes("office")) {
        return item.id === "item_unauthorized_05";
      }
      return false;
    }) || CATALOG[0]!;

  const matchedItem = {
    name: matched.name,
    vendor: matched.vendor,
    category: matched.category,
    amountCents: matched.amountCents,
    amountDollars: (matched.amountCents / 100).toFixed(2),
  };

  // 3. Submit Purchase Intent to Leash Gateway
  const payload = {
    mandateId,
    itemName: matched.name,
    vendorName: matched.vendor,
    category: matched.category,
    amountCents: matched.amountCents,
    justification: `Autonomous purchase required to achieve user goal: "${trimmedGoal}"`,
    currency: "USD",
  };

  try {
    const pRes = await fetch(`${GATEWAY_URL}/api/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const resJson = (await pRes.json()) as any;

    revalidatePath("/");
    revalidatePath("/mandates");
    revalidatePath("/ledger");

    return {
      success: true,
      goal: trimmedGoal,
      matchedItem,
      mandateId,
      verdict: resJson.verdict || (pRes.ok ? "APPROVED" : "DENIED"),
      reason: resJson.reason,
      authorizationId: resJson.authorizationId,
      orderId: resJson.orderId,
      injectionDetected: resJson.injectionDetected,
    };
  } catch (err: any) {
    return {
      success: false,
      goal: trimmedGoal,
      matchedItem,
      mandateId,
      verdict: "ERROR",
      error: err.message || "Failed to reach Leash Gateway",
    };
  }
}
