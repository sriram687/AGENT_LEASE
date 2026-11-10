/**
 * Workflow Trigger Route
 *
 * POST /api/workflows/trigger
 *
 * Sponsor: Render — https://render.com/docs/cron-jobs
 *
 * Provides an HTTP endpoint to manually trigger Render Workflow cron jobs.
 * In production, Render's cron scheduler fires these automatically:
 *   - delivery-sla-check   : every 6 hours
 *   - authorization-expiry-void : daily at 2 AM UTC
 *
 * This endpoint also allows the Cockpit UI and Postman to trigger workflows
 * on-demand for testing and manual recovery scenarios.
 *
 * Security: Accepts internal LEASH_INTERNAL_SECRET header or Render webhook secret.
 */
import { Hono } from "hono";
import {
  runDeliverySLACheck,
  runAuthorizationExpiryVoid,
} from "../workflows/delivery-sla-monitor.js";

export const workflowRouter = new Hono();

workflowRouter.post("/trigger", async (c) => {
  // Simple internal auth — in prod, Render signs cron requests
  const internalSecret = process.env["LEASH_INTERNAL_SECRET"];
  const authHeader = c.req.header("X-Render-Webhook-Secret") || c.req.header("X-Internal-Secret");

  if (internalSecret && authHeader !== internalSecret) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json().catch(() => ({}));
  const workflow = body.workflow as string | undefined;

  if (!workflow) {
    return c.json({ error: "Missing workflow name. Use: delivery-sla-check | authorization-expiry-void" }, 400);
  }

  console.log(`[Render Workflow] Manual trigger: ${workflow}`);

  try {
    if (workflow === "delivery-sla-check") {
      // Run async, respond immediately (Render cron expects fast ACK)
      runDeliverySLACheck().catch(console.error);
      return c.json({
        status: "triggered",
        workflow: "delivery-sla-check",
        message: "Delivery SLA check started (Render Workflow). Check logs for results.",
        sponsor: "Render — https://render.com/docs/cron-jobs",
      });
    }

    if (workflow === "authorization-expiry-void") {
      runAuthorizationExpiryVoid().catch(console.error);
      return c.json({
        status: "triggered",
        workflow: "authorization-expiry-void",
        message: "Authorization expiry void started (Render Workflow). PayPal holds >29d will be voided.",
        sponsor: "Render — https://render.com/docs/cron-jobs",
      });
    }

    return c.json({ error: `Unknown workflow: ${workflow}` }, 400);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workflowRouter.get("/status", async (c) => {
  return c.json({
    workflows: [
      {
        name: "delivery-sla-check",
        description: "Scans AUTHORIZED payments >2 days old, creates SLA alerts in ledger",
        schedule: "Every 6 hours (Render Cron)",
        sponsor: "Render",
        status: "active",
      },
      {
        name: "authorization-expiry-void",
        description: "Voids PayPal authorization holds older than 29 days via PayPal Orders v2 API",
        schedule: "Daily at 2 AM UTC (Render Cron)",
        sponsor: "Render",
        status: "active",
      },
    ],
    renderDocsUrl: "https://render.com/docs/cron-jobs",
  });
});

