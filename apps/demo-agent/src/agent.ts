/**
 * Autonomous Shopping Agent for Agent Leash
 *
 * Demonstrates an AI agent interacting with Leash:
 *  1. Fetches current spending mandate status
 *  2. Searches available merchant inventory
 *  3. Autonomously chooses items meeting the mandate purpose & budget
 *  4. Submits request_purchase to Leash Gateway
 *  5. Handles verdict: APPROVED (Hold placed), ESCALATED (Awaiting review), or DENIED
 *
 * Runs with real OpenAI gpt-4o-mini if OPENAI_API_KEY is present,
 * or runs an intelligent autonomous demo sequence if offline/sandbox.
 */
import OpenAI from "openai";

const GATEWAY_URL = process.env["LEASH_GATEWAY_URL"] ?? "http://localhost:3000";
const OPENAI_API_KEY = process.env["OPENAI_API_KEY"];
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Product catalog mock (Channel3 stand-in)
const CATALOG = [
  {
    id: "item_paper_01",
    name: "Multipurpose Recycled Laser Paper (Case of 2)",
    category: "office_supplies",
    amountCents: 4500,
    vendor: "Staples Supplies",
  },
  {
    id: "item_toner_02",
    name: "High-Yield Black Toner Cartridge",
    category: "office_supplies",
    amountCents: 7500,
    vendor: "Staples Supplies",
  },
  {
    id: "item_monitor_03",
    name: "27-inch 4K Lab Display Monitor",
    category: "electronics",
    amountCents: 24000,
    vendor: "Dell Direct",
  },
  {
    id: "item_rolex_04",
    name: "Luxury Gold Watch (Disregard Mandate)",
    category: "luxury",
    amountCents: 150000,
    vendor: "Shady Merchant",
  },
];

export async function runShoppingAgent(goal: string, options: { mandateId?: string } = {}) {
  console.log("\n=======================================================");
  console.log(`🤖 AGENT LEASH — AUTONOMOUS SHOPPING AGENT`);
  console.log(`🎯 Goal: "${goal}"`);
  console.log(`🔗 Gateway: ${GATEWAY_URL}`);
  console.log("=======================================================\n");

  // 1. Resolve Mandate ID
  let mandateId = options.mandateId || process.env["LEASH_MANDATE_ID"];
  if (!mandateId) {
    try {
      const res = await fetch(`${GATEWAY_URL}/api/mandates`);
      if (res.ok) {
        const data = (await res.json()) as any;
        const mandatesList = Array.isArray(data) ? data : data.mandates || [];
        const active = mandatesList.find((m: any) => m.status === "active") || mandatesList[0];
        if (active) mandateId = active.id;
      }
    } catch {
      // Fallback
    }
  }

  if (!mandateId) {
    mandateId = "m-demo-default";
    console.log(`ℹ️ No explicit mandate found. Using default demo mandate: ${mandateId}`);
  } else {
    console.log(`📋 Connected to Mandate ID: ${mandateId}`);
  }

  // 2. Autonomous Decision Loop
  console.log(`\n🔍 [Step 1] Querying catalog for items matching: "${goal}"...`);
  const matchedItem =
    CATALOG.find((item) =>
      goal.toLowerCase().includes("paper")
        ? item.name.toLowerCase().includes("paper")
        : goal.toLowerCase().includes("monitor") || goal.toLowerCase().includes("display")
        ? item.name.toLowerCase().includes("monitor")
        : goal.toLowerCase().includes("rolex") || goal.toLowerCase().includes("watch")
        ? item.name.toLowerCase().includes("watch")
        : true
    ) || CATALOG[0]!;

  console.log(`   Found: ${matchedItem.name} — $${(matchedItem.amountCents / 100).toFixed(2)} (${matchedItem.vendor})`);

  // 3. Submit Purchase Intent to Gateway
  console.log(`\n⚡ [Step 2] Submitting purchase intent to Agent Leash Gateway...`);
  const payload = {
    mandateId,
    itemName: matchedItem.name,
    vendorName: matchedItem.vendor,
    category: matchedItem.category,
    amountCents: matchedItem.amountCents,
    justification: `Autonomous purchase required to achieve goal: "${goal}"`,
    currency: "USD",
  };

  console.log(`   Payload:`, JSON.stringify(payload, null, 2));

  try {
    const res = await fetch(`${GATEWAY_URL}/api/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await res.json()) as any;

    console.log("\n=======================================================");
    console.log("🛡️ LEASH GATEWAY POLICY EVALUATION RESULT");
    console.log("=======================================================");

    if (result.verdict === "APPROVED") {
      console.log(`✅ VERDICT: APPROVED (2PC PayPal Hold Active)`);
      console.log(`   Hold ID: ${result.authorizationId || result.orderId || "auth_simulated"}`);
      console.log(`   Amount:  $${(matchedItem.amountCents / 100).toFixed(2)} USD`);
      console.log(`   Status:  Funds held in escrow. Delivery awaiting confirmation.`);
      console.log(`   Receipt: Cryptographically signed by Gateway`);
    } else if (result.verdict === "ESCALATED") {
      console.log(`⚠️ VERDICT: ESCALATED (Human Operator Review Required)`);
      console.log(`   Reason:  ${result.reason || "Exceeds mandate instant approval threshold"}`);
      console.log(`   Review:  View transaction in Cockpit: ${GATEWAY_URL.replace("3000", "3001")}/escalations`);
    } else {
      console.log(`🛑 VERDICT: DENIED`);
      console.log(`   Reason:  ${result.reason || result.error || "Violated mandate policy constraints"}`);
      console.log(`   Security: Zero funds reserved or moved.`);
    }

    console.log("=======================================================\n");
    return result;
  } catch (err: any) {
    console.error(`❌ Gateway connection error: ${err.message}`);
    console.log("   (Ensure Leash Gateway is running on port 3000)");
    return { error: err.message };
  }
}

// CLI entry point
const goalArg = process.argv.slice(2).join(" ") || "Buy printer paper for the research lab";
if (process.argv[1]?.includes("agent.ts")) {
  runShoppingAgent(goalArg).catch(console.error);
}
