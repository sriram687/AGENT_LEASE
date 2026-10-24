import { db } from "@leash/db";
import { escalations, purchaseRequests, mandates, agents } from "@leash/db";
import { eq, desc } from "drizzle-orm";
import { getUserProfile } from "@/lib/actions/user";

export async function getPendingEscalations() {
  try {
    const profileRes = await getUserProfile();
    const operator = profileRes.user;

    const rows = await db
      .select({
        escalation: escalations,
        purchaseRequest: purchaseRequests,
        mandate: mandates,
        agent: agents,
      })
      .from(escalations)
      .innerJoin(purchaseRequests, eq(escalations.purchaseRequestId, purchaseRequests.id))
      .innerJoin(mandates, eq(purchaseRequests.mandateId, mandates.id))
      .innerJoin(agents, eq(mandates.agentId, agents.id))
      .where(eq(escalations.status, "PENDING"))
      .orderBy(desc(escalations.createdAt));

    return rows.map(({ escalation, purchaseRequest, mandate, agent }) => ({
      id: escalation.id,
      purchaseRequestId: escalation.purchaseRequestId,
      status: escalation.status,
      leashReasoning: escalation.leashReasoning,
      humanComment: escalation.humanComment,
      expiresAt: escalation.expiresAt.toISOString(),
      createdAt: escalation.createdAt.toISOString(),
      agentName: agent.name,
      mandatePurpose: mandate.purpose,
      perPurchaseCapCents: mandate.perPurchaseCapCents,
      purchaseRequest: {
        id: purchaseRequest.id,
        itemName: purchaseRequest.itemName,
        vendorName: purchaseRequest.vendorName,
        amountCents: purchaseRequest.amountCents,
        currency: purchaseRequest.currency,
        justification: purchaseRequest.justification,
        category: purchaseRequest.category,
      },
      decision: null,
    }));
  } catch (error) {
    console.error("[getPendingEscalations] Error fetching escalations:", error);
    return [];
  }
}
