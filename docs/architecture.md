# Architecture Notes

## Key Design Decisions

### Why Hono over Express for the gateway?
- First-class TypeScript support
- Smaller bundle, faster cold starts on Render
- Web-standard `Request`/`Response` — easier testing without mocking
- Compatible with Node.js, Cloudflare Workers, Bun if we migrate later

### Why Drizzle ORM over Prisma?
- Drizzle is SQL-first: the generated SQL is readable and predictable
- pgvector operations can be expressed in raw SQL that Drizzle passes through cleanly
- Smaller bundle, no Rust binary needed (important for Render cold starts)
- `drizzle-kit` migrations are plain SQL files, easy to audit

### Why pnpm + Turbo monorepo?
- Shared types (Zod schemas) are imported, not copy-pasted
- Policy engine unit tests run independently of the gateway
- Cockpit can import types from `@leash/types` with full TypeScript inference
- Turbo caches build artifacts, speeding up CI

### PayPal authorization lifecycle (confirmed from docs)
- Honor period: 3 days from authorization
- Full authorization validity: 29 days
- Capture after day 3: possible but subject to risk assessment
- Reauthorization: one reauth allowed after honor period expires
- Each reauth produces a new `authorization_id`
- Strategy: Render Workflow fires at day 2, checks delivery status, reauthorizes if needed

### Budget reservation pattern (prevents concurrent overspend)
```sql
BEGIN;
SELECT total_budget_cents, spent_cents, reserved_cents
FROM mandates
WHERE id = $1
FOR UPDATE;  -- row-level lock

-- application checks: amount <= (total - spent - reserved)
-- if OK:
UPDATE mandates
SET reserved_cents = reserved_cents + $amount
WHERE id = $1;

COMMIT;
```
The lock is held for the duration of the PayPal authorization call.
If the PayPal call fails, the transaction is rolled back and reservation is released.

### Transactional Outbox pattern
State changes and queue events are written in the same DB transaction:
1. Update `purchase_requests.status`
2. Insert into `outbox` (PENDING)
3. Commit

A background poller (50ms interval) reads PENDING outbox entries and:
1. Sets status = PROCESSING
2. Enqueues in BullMQ
3. Sets status = DONE (or FAILED after max retries)

This ensures no events are lost if the process crashes between DB write and queue push.

### BullMQ vs Render Workflows: split of responsibility
| Job type | Platform | Reason |
|----------|----------|--------|
| Authorize payment | BullMQ | Needs retry within seconds; short-lived |
| Webhook processing | BullMQ | Idempotent; fast retry; Redis-backed |
| Delivery SLA check (72h) | Render Workflows | Long-running; survives restarts |
| Honor period check (48h) | Render Workflows | Long-running; survives restarts |
| Price watch | Render Workflows | Recurring; long-lived |

### pgvector similarity threshold calibration
The default threshold (0.85) is a starting point.
Tuning process:
1. Create a labeled dataset of (item_a, item_b, is_duplicate) pairs
2. Sweep thresholds from 0.70 to 0.95 in 0.05 increments
3. Compute precision and recall at each threshold
4. Choose the threshold maximizing F1 on the validation set
5. Publish the precision/recall curve in the README

### MCP transport choice
- **Local dev:** stdio transport (simple, no auth complexity)
- **Deployed:** SSE transport with Bearer token auth in the HTTP layer
- The Bearer token is the agent's scoped API key, resolved to a mandate

### AG Grid vs AG Studio
AG Studio's docs (at time of writing) show Vue and Angular examples.
Decision: use **AG Grid React** directly (not AG Studio IDE) for the cockpit.
AG Grid React is fully documented for React/Next.js.
AG Charts React is used for spend visualization.

### Injection screen architecture
The injection screen wraps the LLM judge output. It cannot loosen decisions.
```
deterministic (DENY)  →  skip LLM entirely  →  final: DENY
deterministic (pass)  →  LLM judge          →  injection screen
                                                  │
                           injection detected? ───┤
                              ▼ yes               │ no
                           tighten to DENY        │
                                             use LLM verdict
```
This means a prompt injection that tricks the LLM into saying APPROVE is
overridden to DENY by the injection screen.

### Ed25519 key management
- Keys are generated client-side in the cockpit (Web Crypto API)
- The **private key never leaves the browser** (stored in IndexedDB)
- The public key is sent to the gateway and stored in `users.public_key`
- The gateway verifies the mandate signature on every `request_purchase` call
- If the signature is invalid, the request is denied with error `invalid_mandate_signature`
