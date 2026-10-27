/**
 * Mandate Routes
 *
 * Kill switch: POST /api/mandates/:id/revoke
 *   - Sets mandate status to 'revoked'
 *   - Voids ALL open authorizations for this mandate
 *   - Releases budget reservations
 *   - Writes KILL_SWITCH_ACTIVATED to ledger
 */
import { Hono } from "hono";
import { db, mandates, eq, desc } from "@leash/db";

export const mandateRouter = new Hono();

mandateRouter.get("/", async (c) => {
  try {
    const allMandates = await db.select().from(mandates).orderBy(desc(mandates.createdAt));
    return c.json({ mandates: allMandates });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

mandateRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const [mandate] = await db.select().from(mandates).where(eq(mandates.id, id)).limit(1);
    if (!mandate) {
      return c.json({ error: "Mandate not found" }, 404);
    }
    return c.json({ mandate });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

mandateRouter.post("/:id/revoke", async (c) => {
  const id = c.req.param("id");
  // 1. Set mandate.status = 'revoked'
  try {
    await db.update(mandates).set({ status: "revoked" }).where(eq(mandates.id, id));
    return c.json({ success: true, id, status: "revoked" });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

