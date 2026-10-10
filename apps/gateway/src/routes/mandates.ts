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

export const mandateRouter = new Hono();

mandateRouter.post("/:id/revoke", async (c) => {
  const id = c.req.param("id");
  // TODO Day 2: implement full kill switch
  // 1. Set mandate.status = 'revoked' with row lock
  // 2. Find all AUTHORIZED payment records for this mandate
  // 3. For each: call PayPal void authorization API
  // 4. Release reserved_cents
  // 5. Append KILL_SWITCH_ACTIVATED to ledger
  return c.json({ success: true, id, status: "revoked" });
});
