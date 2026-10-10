/**
 * PayPal Webhook Handler
 *
 * Verifies PayPal-Transmission-Sig before processing.
 * Events handled:
 *   - PAYMENT.AUTHORIZATION.CREATED   → update payment record
 *   - PAYMENT.AUTHORIZATION.VOIDED    → release budget reservation
 *   - PAYMENT.CAPTURE.COMPLETED       → convert reservation to spent
 *   - PAYMENT.CAPTURE.DENIED          → void auth, release reservation
 *   - PAYMENT.CAPTURE.REFUNDED        → update ledger
 */
import { Hono } from "hono";
import type { DB } from "@leash/db";
import { PAYPAL_WEBHOOK_EVENTS } from "@leash/types";

export const webhookRouter = new Hono();

webhookRouter.post("/paypal", async (c) => {
  // TODO Day 3: Implement PayPal signature verification
  // Headers needed: paypal-transmission-id, paypal-transmission-time,
  //                 paypal-cert-url, paypal-transmission-sig, paypal-auth-algo
  const body = await c.req.json();
  const eventType = body.event_type as string;

  if (!PAYPAL_WEBHOOK_EVENTS.includes(eventType as any)) {
    return c.json({ error: "Unknown event type" }, 400);
  }

  // TODO: Route to appropriate handler based on eventType
  console.log(`Received PayPal webhook: ${eventType}`);

  return c.json({ received: true });
});

webhookRouter.post("/delivery", async (c) => {
  // TODO Day 4: Demo store delivery events
  // Triggered when demo store's carrier simulator marks an order as DELIVERED
  const body = await c.req.json();
  console.log("Received delivery event:", body);
  return c.json({ received: true });
});
