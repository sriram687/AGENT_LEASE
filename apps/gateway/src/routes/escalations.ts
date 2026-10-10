/**
 * Escalation Routes
 *
 * Used by the cockpit UI for human approve/reject.
 * Auth: internal shared secret (cockpit → gateway) or session token.
 */
import { Hono } from "hono";

export const escalationRouter = new Hono();

// GET /api/escalations – list pending
escalationRouter.get("/", async (c) => {
  // TODO Day 3: query DB for pending escalations
  return c.json({ escalations: [] });
});

// POST /api/escalations/:id/approve
escalationRouter.post("/:id/approve", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  // TODO Day 3: validate auth, update escalation, trigger authorization
  return c.json({ success: true, id, action: "approved", comment: body.comment });
});

// POST /api/escalations/:id/reject
escalationRouter.post("/:id/reject", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  // TODO Day 3: validate auth, update escalation, log decision
  return c.json({ success: true, id, action: "rejected", comment: body.comment });
});
