/**
 * Shopping Scenario: Legitimate Purchase under Mandate
 *
 * Runs an autonomous agent purchasing printer paper for the research lab.
 * Expected result: APPROVED -> 2PC Hold placed -> Visible in Cockpit.
 */
import { runShoppingAgent } from "../agent.js";

async function main() {
  console.log("🚀 Executing Scenario: Legitimate Office Supplies Order...");
  await runShoppingAgent("Buy 2 cases of premium multipurpose laser paper for the Chennai lab");
}

main().catch(console.error);
