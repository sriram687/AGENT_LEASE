"use server";

import {
  db,
  paymentRecords,
  purchaseRequests,
  escalations,
  mandates,
  agents,
} from "@leash/db";
import { eq, desc } from "drizzle-orm";

export interface NotificationItem {
  id: string;
  type: "hold" | "escalation" | "captured" | "system";
  title: string;
  description: string;
  amountCents?: number;
  amountDollars?: string;
  vendorName?: string;
  agentName?: string;
  actionUrl?: string;
  actionText?: string;
  actionType?: "capture" | "review" | "link";
  paymentRecordId?: string;
  escalationId?: string;
  timestamp: Date;
  read: boolean;
}

export interface NotificationSummary {
  unreadCount: number;
  activeHoldsCount: number;
  pendingEscalationsCount: number;
  notifications: NotificationItem[];
}

export async function getNotifications(): Promise<{
  success: boolean;
  summary: NotificationSummary;
  error?: string;
}> {
  try {
    const notifications: NotificationItem[] = [];

    // 1. Fetch active holds awaiting capture
    const activeHolds = await db
      .select({
        payment: paymentRecords,
        purchaseRequest: purchaseRequests,
        mandate: mandates,
        agent: agents,
      })
      .from(paymentRecords)
      .innerJoin(purchaseRequests, eq(paymentRecords.purchaseRequestId, purchaseRequests.id))
      .innerJoin(mandates, eq(purchaseRequests.mandateId, mandates.id))
      .innerJoin(agents, eq(mandates.agentId, agents.id))
      .where(eq(paymentRecords.status, "AUTHORIZED"))
      .orderBy(desc(paymentRecords.createdAt))
      .limit(10);

    for (const row of activeHolds) {
      notifications.push({
        id: `hold-${row.payment.id}`,
        type: "hold",
        title: `⚡ 2PC Hold Ready to Capture ($${(row.payment.amountCents / 100).toFixed(2)})`,
        description: `${row.purchaseRequest.vendorName}: ${row.purchaseRequest.itemName}. Escrowed in PayPal Sandbox.`,
        amountCents: row.payment.amountCents,
        amountDollars: (row.payment.amountCents / 100).toFixed(2),
        vendorName: row.purchaseRequest.vendorName,
        agentName: row.agent.name,
        actionUrl: "/mandates",
        actionText: "💸 Confirm & Capture",
        actionType: "capture",
        paymentRecordId: row.payment.id,
        timestamp: row.payment.authorizedAt || row.payment.createdAt,
        read: false,
      });
    }

    // 2. Fetch pending escalations awaiting human review
    const pendingEscalations = await db
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
      .orderBy(desc(escalations.createdAt))
      .limit(5);

    for (const row of pendingEscalations) {
      notifications.push({
        id: `esc-${row.escalation.id}`,
        type: "escalation",
        title: `🚨 Over-Cap Escalation ($${(row.purchaseRequest.amountCents / 100).toFixed(2)})`,
        description: `${row.agent.name} requested compute from ${row.purchaseRequest.vendorName}. Exceeds cap.`,
        amountCents: row.purchaseRequest.amountCents,
        amountDollars: (row.purchaseRequest.amountCents / 100).toFixed(2),
        vendorName: row.purchaseRequest.vendorName,
        agentName: row.agent.name,
        actionUrl: "/escalations",
        actionText: "Review SLA",
        actionType: "review",
        escalationId: row.escalation.id,
        timestamp: row.escalation.createdAt,
        read: false,
      });
    }

    // 3. Fetch recently captured payments
    const captured = await db
      .select({
        payment: paymentRecords,
        purchaseRequest: purchaseRequests,
      })
      .from(paymentRecords)
      .innerJoin(purchaseRequests, eq(paymentRecords.purchaseRequestId, purchaseRequests.id))
      .where(eq(paymentRecords.status, "CAPTURED"))
      .orderBy(desc(paymentRecords.capturedAt))
      .limit(3);

    for (const row of captured) {
      notifications.push({
        id: `cap-${row.payment.id}`,
        type: "captured",
        title: `✅ Payment Captured ($${(row.payment.amountCents / 100).toFixed(2)})`,
        description: `Delivered & settled on PayPal Sandbox. Capture ID: ${row.payment.paypalCaptureId?.slice(0, 16) || "N/A"}`,
        amountCents: row.payment.amountCents,
        amountDollars: (row.payment.amountCents / 100).toFixed(2),
        vendorName: row.purchaseRequest.vendorName,
        actionUrl: "/ledger",
        actionText: "Inspect Ledger",
        actionType: "link",
        timestamp: row.payment.capturedAt || row.payment.updatedAt,
        read: true,
      });
    }

    // Sort by timestamp descending
    notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const activeHoldsCount = activeHolds.length;
    const pendingEscalationsCount = pendingEscalations.length;
    const unreadCount = activeHoldsCount + pendingEscalationsCount;

    return {
      success: true,
      summary: {
        unreadCount,
        activeHoldsCount,
        pendingEscalationsCount,
        notifications,
      },
    };
  } catch (error: any) {
    console.error("[getNotifications] error:", error);
    return {
      success: false,
      summary: {
        unreadCount: 0,
        activeHoldsCount: 0,
        pendingEscalationsCount: 0,
        notifications: [],
      },
      error: error.message,
    };
  }
}
