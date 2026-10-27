"use server";

import { revalidatePath } from "next/cache";
import { db, purchaseRequests, mandates, agents, eq, desc } from "@leash/db";

const GATEWAY_URL = process.env["LEASH_GATEWAY_URL"] ?? "http://localhost:3000";

export interface DispatchTaskInput {
  task: string;
  mandateId?: string | undefined;
  vendorName?: string | undefined;
  itemName?: string | undefined;
  amountDollars?: string | undefined;
  category?: string | undefined;
}


export interface AgentDispatchResult {
  success: boolean;
  task: string;
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

export interface AssignedTaskItem {
  id: string;
  itemName: string;
  vendorName: string;
  category: string | null;
  amountCents: number;
  amountDollars: string;
  status: string;
  justification: string;
  agentName: string;
  mandatePurpose: string;
  requestedAt: string;
}

interface LLMDecomposedTask {
  itemName?: string;
  vendorName?: string;
  category?: string;
  amountDollars?: number;
  justification?: string;
}

/**
 * Attempts to decompose freeform mission instructions using a connected LLM
 * (e.g. Lab PC running Ollama 14B or OpenAI), falling back smoothly if unavailable.
 */
async function tryLLMDecomposition(taskText: string): Promise<LLMDecomposedTask | null> {
  const baseURL = process.env["LLM_BASE_URL"] || process.env["OPENAI_BASE_URL"];
  const apiKey = process.env["OPENAI_API_KEY"] || "ollama";
  const model = process.env["LLM_MODEL"] || process.env["OPENAI_MODEL"] || "qwen2.5:14b";

  if (!baseURL && (!process.env["OPENAI_API_KEY"] || process.env["OPENAI_API_KEY"] === "mock")) {
    return null;
  }

  const endpoint = baseURL
    ? `${baseURL.replace(/\/+$/, "")}/chat/completions`
    : "https://api.openai.com/v1/chat/completions";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              'You are an autonomous procurement AI. Extract the target item, vendor, category (MCC code or short slug like 5734, 7372, cloud_services, office_supplies, luxury), estimated amount in USD, and justification from the user mission. Return ONLY a valid JSON object matching: {"itemName": string, "vendorName": string, "category": string, "amountDollars": number, "justification": string}.',
          },
          {
            role: "user",
            content: taskText,
          },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content) as LLMDecomposedTask;
  } catch (err: any) {
    console.warn("[tryLLMDecomposition] LLM query timed out or unavailable, using heuristics:", err?.message);
    return null;
  }
}

/**
 * Dispatch an autonomous agent task to Leash Gateway.
 * Dynamically resolves or extracts parameters from natural language.
 */
export async function dispatchAgentTask(input: DispatchTaskInput): Promise<AgentDispatchResult> {
  const taskText = input.task.trim();
  if (!taskText) {
    return {
      success: false,
      task: "",
      matchedItem: { name: "", vendor: "", category: "", amountCents: 0, amountDollars: "0.00" },
      mandateId: "",
      verdict: "ERROR",
      error: "Task instructions cannot be empty",
    };
  }

  // 1. Resolve Mandate ID
  let mandateId = input.mandateId;
  if (!mandateId) {
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
  }

  if (!mandateId) {
    mandateId = "146ca2d7-d84f-4153-a440-b359253f976e";
  }

  // 2. Parse Natural Language Task (via Local LLM / Ollama if available, else Heuristics)
  const lower = taskText.toLowerCase();

  // Try calling Local LLM (e.g. Lab PC Ollama 14B or OpenAI) if configured
  const llmParsed = await tryLLMDecomposition(taskText);

  // Extract dollar amount if explicitly given or extracted by LLM
  let amountCents = input.amountDollars ? Math.round(parseFloat(input.amountDollars) * 100) : 0;
  if ((isNaN(amountCents) || amountCents <= 0) && llmParsed?.amountDollars) {
    amountCents = Math.round(llmParsed.amountDollars * 100);
  }
  if (isNaN(amountCents) || amountCents <= 0) {
    const dollarMatch = taskText.match(/\$([0-9,]+(?:\.[0-9]{2})?)/);
    if (dollarMatch && dollarMatch[1]) {
      amountCents = Math.round(parseFloat(dollarMatch[1].replace(/,/g, "")) * 100);
    }
  }

  // Determine Vendor
  let vendorName = input.vendorName?.trim() || llmParsed?.vendorName;
  if (!vendorName) {
    if (lower.includes("modal")) vendorName = "Modal Labs";
    else if (lower.includes("pinecone")) vendorName = "Pinecone";
    else if (lower.includes("runpod")) vendorName = "RunPod";
    else if (lower.includes("aws") || lower.includes("amazon")) vendorName = "AWS Cloud Services";
    else if (lower.includes("github")) vendorName = "GitHub";
    else if (lower.includes("digitalocean")) vendorName = "DigitalOcean";
    else if (lower.includes("staples") || lower.includes("paper") || lower.includes("office")) vendorName = "Staples Supplies";
    else if (lower.includes("rolex") || lower.includes("watch") || lower.includes("gold") || lower.includes("luxury")) vendorName = "Shady Merchant";
    else vendorName = "Cloud Provider";
  }

  // Determine Item Name
  let itemName = input.itemName?.trim() || llmParsed?.itemName;
  if (!itemName) {
    if (lower.includes("gpu") || lower.includes("modal")) {
      itemName = "Modal Labs Serverless GPU Inference (A100 Cluster)";
      if (amountCents <= 0) amountCents = 4500;
    } else if (lower.includes("pinecone") || lower.includes("vector") || lower.includes("embedding")) {
      itemName = "Pinecone Serverless Vector Index Compute Units";
      if (amountCents <= 0) amountCents = 3200;
    } else if (lower.includes("runpod") || lower.includes("cloud")) {
      itemName = "RunPod Dedicated H100 Cloud Instance (10 hrs)";
      if (amountCents <= 0) amountCents = 2800;
    } else if (lower.includes("rolex") || lower.includes("watch") || lower.includes("gold") || lower.includes("luxury")) {
      itemName = "Luxury Gold Watch (Disregard Mandate)";
      if (amountCents <= 0) amountCents = 150000;
    } else if (lower.includes("paper") || lower.includes("office") || lower.includes("staples")) {
      itemName = "Multipurpose Recycled Laser Paper (Case of 2)";
      if (amountCents <= 0) amountCents = 4500;
    } else {
      itemName = taskText.slice(0, 60);
      if (amountCents <= 0) amountCents = 3500;
    }
  }

  // Determine MCC Category
  let category = input.category?.trim() || llmParsed?.category;
  if (!category) {
    if (vendorName === "Pinecone" || lower.includes("vector")) category = "7372";
    else if (vendorName === "Modal Labs" || vendorName === "RunPod" || lower.includes("gpu")) category = "5734";
    else if (lower.includes("paper") || lower.includes("office")) category = "office_supplies";
    else if (lower.includes("luxury") || lower.includes("watch") || lower.includes("gold")) category = "luxury";
    else category = "7372";
  }

  const matchedItem = {
    name: itemName,
    vendor: vendorName,
    category,
    amountCents,
    amountDollars: (amountCents / 100).toFixed(2),
  };

  // 3. Submit Purchase Intent to Gateway
  const payload = {
    mandateId,
    itemName,
    vendorName,
    category,
    amountCents,
    justification: `Autonomous task execution: "${taskText}"`,
    currency: "USD",
  };

  try {
    const res = await fetch(`${GATEWAY_URL}/api/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const resJson = (await res.json()) as any;

    revalidatePath("/");
    revalidatePath("/tasks");
    revalidatePath("/mandates");
    revalidatePath("/ledger");

    return {
      success: true,
      task: taskText,
      matchedItem,
      mandateId,
      verdict: resJson.verdict || (res.ok ? "APPROVED" : "DENIED"),
      reason: resJson.reason,
      authorizationId: resJson.authorizationId,
      orderId: resJson.orderId,
      injectionDetected: resJson.injectionDetected,
    };
  } catch (err: any) {
    return {
      success: false,
      task: taskText,
      matchedItem,
      mandateId,
      verdict: "ERROR",
      error: err.message || "Failed to communicate with Leash Gateway",
    };
  }
}

/**
 * Fetch all assigned tasks directly from PostgreSQL purchaseRequests table.
 */
export async function getAssignedTasks(): Promise<AssignedTaskItem[]> {
  try {
    const rows = await db
      .select({
        id: purchaseRequests.id,
        itemName: purchaseRequests.itemName,
        vendorName: purchaseRequests.vendorName,
        category: purchaseRequests.category,
        amountCents: purchaseRequests.amountCents,
        status: purchaseRequests.status,
        justification: purchaseRequests.justification,
        requestedAt: purchaseRequests.requestedAt,
        agentName: agents.name,
        mandatePurpose: mandates.purpose,
      })
      .from(purchaseRequests)
      .innerJoin(mandates, eq(purchaseRequests.mandateId, mandates.id))
      .innerJoin(agents, eq(mandates.agentId, agents.id))
      .orderBy(desc(purchaseRequests.requestedAt))
      .limit(30);

    return rows.map((r) => ({
      id: r.id,
      itemName: r.itemName,
      vendorName: r.vendorName,
      category: r.category,
      amountCents: r.amountCents,
      amountDollars: (r.amountCents / 100).toFixed(2),
      status: r.status,
      justification: r.justification,
      agentName: r.agentName,
      mandatePurpose: r.mandatePurpose,
      requestedAt: r.requestedAt.toISOString(),
    }));
  } catch (error) {
    console.error("[getAssignedTasks] Error:", error);
    return [];
  }
}
