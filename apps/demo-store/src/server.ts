/**
 * Demo Store Server
 *
 * A minimal sandbox merchant app that:
 *  1. Receives orders from Leash (via PayPal order ID)
 *  2. Simulates shipping with a carrier simulator
 *  3. Posts tracking data to PayPal via Add Tracking API
 *  4. Sends delivery events to Leash webhook /webhooks/delivery
 *
 * This is the "delivery" signal for capture-on-delivery mode.
 * The carrier simulator is the independent delivery signal (not merchant-supplied)
 * to guard against false "delivered" reports.
 *
 * Sandbox only. Not production code.
 */
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { z } from "zod";

const app = new Hono();

// ─── In-memory order store (replace with DB for persistence) ─────────────
const orders = new Map<string, Order>();

interface Order {
  paypalOrderId: string;
  purchaseRequestId: string;
  itemName: string;
  vendorName: string;
  amountCents: number;
  status: "received" | "processing" | "shipped" | "delivered" | "failed";
  trackingNumber?: string;
  carrier?: string;
  createdAt: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
}

// ─── Routes ──────────────────────────────────────────────────────────────

// POST /orders – called by Leash when an order is authorized
app.post("/orders", async (c) => {
  const body = await c.req.json();
  const order: Order = {
    paypalOrderId: body.paypalOrderId,
    purchaseRequestId: body.purchaseRequestId,
    itemName: body.itemName,
    vendorName: body.vendorName,
    amountCents: body.amountCents,
    status: "received",
    createdAt: new Date(),
  };
  orders.set(body.paypalOrderId, order);
  console.log(`📦 Order received: ${body.paypalOrderId}`);
  return c.json({ success: true, orderId: body.paypalOrderId });
});

// POST /orders/:id/ship – simulates the merchant shipping the item
app.post("/orders/:id/ship", async (c) => {
  const order = orders.get(c.req.param("id"));
  if (!order) return c.json({ error: "Order not found" }, 404);

  order.status = "shipped";
  order.trackingNumber = `DEMO${Date.now()}`;
  order.carrier = "FEDEX";
  order.shippedAt = new Date();

  // Post tracking to PayPal Add Tracking API
  await postTrackingToPayPal(order);

  // Notify Leash
  await notifyLeash(order, "IN_TRANSIT");

  return c.json({ success: true, trackingNumber: order.trackingNumber });
});

// POST /orders/:id/deliver – simulates delivery (demo/test use only)
app.post("/orders/:id/deliver", async (c) => {
  const order = orders.get(c.req.param("id"));
  if (!order) return c.json({ error: "Order not found" }, 404);

  order.status = "delivered";
  order.deliveredAt = new Date();

  // Notify Leash – this triggers capture
  await notifyLeash(order, "DELIVERED");

  return c.json({ success: true, deliveredAt: order.deliveredAt });
});

// GET /orders – list all orders (cockpit integration)
app.get("/orders", (c) => {
  return c.json({ orders: Array.from(orders.values()) });
});

// ─── Helpers ─────────────────────────────────────────────────────────────

async function postTrackingToPayPal(order: Order) {
  // TODO Day 4: Use PayPal Add Tracking API
  // POST /v1/shipping/trackers-batch
  // Requires: tracking_number, carrier, capture_id
  console.log(`TODO: post tracking ${order.trackingNumber} to PayPal for order ${order.paypalOrderId}`);
}

async function notifyLeash(order: Order, eventType: string) {
  const gatewayBase = process.env["LEASH_GATEWAY_URL"] || "http://localhost:3000";
  const leashWebhookUrl = `${gatewayBase}/webhooks/delivery`;

  try {
    await fetch(leashWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purchaseRequestId: order.purchaseRequestId,
        paypalOrderId: order.paypalOrderId,
        eventType,
        trackingNumber: order.trackingNumber,
        carrier: order.carrier,
        occurredAt: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error("Failed to notify Leash:", err);
  }
}

const port = Number(process.env["PORT"] ?? 3002);
serve({ fetch: app.fetch, port }, () => {
  console.log(`🏪 Demo Store running on port ${port}`);
});
