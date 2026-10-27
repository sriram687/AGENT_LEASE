/**
 * Shopping Scenario: Legitimate Purchase under Mandate
 *
 * Runs an autonomous agent purchasing serverless vector units under active mandate.
 * Expected result: APPROVED -> 2PC Hold placed -> Visible in Cockpit.
 */
import { runShoppingAgent } from "../agent.js";

async function main() {
  console.log("🚀 Executing Scenario: Legitimate Agent Leash Autonomous Procurement...");
  await runShoppingAgent("Provision Pinecone Serverless Vector Index Compute Units for embeddings store");
}

main().catch(console.error);


