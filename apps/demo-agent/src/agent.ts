/**
 * Demo Agent
 *
 * A shopping agent that connects to Leash over MCP and demonstrates the full flow:
 *  1. Get mandate status to understand budget/constraints
 *  2. Search for products using Channel3 (via Leash's search_products tool)
 *  3. Pick the best match and request a purchase
 *  4. Handle the response (approved / escalated / denied)
 *
 * This agent is intentionally simple to show that ANY MCP-capable agent works.
 * LLM: OpenAI gpt-4o-mini with MCP tool use.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import OpenAI from "openai";

const apiKey = process.env["OPENAI_API_KEY"];
const openai = apiKey ? new OpenAI({ apiKey }) : null;

const LEASH_GATEWAY_URL = process.env["LEASH_GATEWAY_URL"] ?? "http://localhost:3000";
const AGENT_API_KEY = process.env["LEASH_AGENT_API_KEY"] ?? "";

async function runShoppingAgent(goal: string) {
  console.log(`\n🤖 Demo Agent starting with goal: "${goal}"\n`);

  // TODO Day 5: Connect via SSE transport (for remote MCP server)
  // For now, using stdio transport for local testing
  
  // Initialize MCP client
  // const transport = new SSEClientTransport(...)
  // const client = new Client({ name: "demo-agent", version: "0.1.0" })
  // await client.connect(transport)

  // TODO Day 5: Full agent loop implementation
  // 1. Call get_mandate_status
  // 2. Use OpenAI function calling with MCP tools
  // 3. Agent decides: search → pick → request_purchase
  // 4. Handle escalation (notify user to check cockpit)

  console.log("TODO Day 5: Implement full agent shopping loop");
}

const goal = process.argv[2] ?? "Buy printer paper for the Chennai lab";
runShoppingAgent(goal).catch(console.error);
