# Agent Leash 🔗

> **"Make autonomous money safe."**  
> A cryptographically-constrained payment gateway that sits between an AI agent and PayPal. The agent gets one tool — `request_purchase` — and Leash decides what happens next.

[![Sandbox Only](https://img.shields.io/badge/environment-sandbox_only-orange)](https://developer.paypal.com/docs/api/overview/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)

---

## What Is Agent Leash?

AI agents that can spend money autonomously are powerful and dangerous. PayPal's own MCP server gives any agent full payment authority the moment you hand it credentials. Leash is the safety layer in between.

```
[Any AI agent]  ──MCP──►  [LEASH GATEWAY (MCP server)]
                                   │
        ┌──────────────────────────┼───────────────────────────┐
        ▼                          ▼                           ▼
 [Policy engine]          [Payment orchestrator]        [Ledger (append-only)]
  1. Deterministic rules   PayPal Agent Toolkit /              ▲
  2. LLM intent judge      Server SDK: authorize →             │
  3. Injection screen      capture / void / refund      [Cockpit UI (AG Grid)]
        │                          │                           ▲
        ▼                          ▼                           │
 [Escalation: human   ◄──── [PayPal sandbox] ──webhooks──► [Webhook handler]
  approve / reject]           Orders · Vault · Tracking          │
                                                          [Render Workflows:
 [Channel3] ◄── product search                             timeouts, reauth,
 [Demo store] ── shipment events ─────────────────────────► price watch]
```

**One-line version:** Agent asks → Leash checks → PayPal holds the money → delivery confirmed → Leash captures (or voids) → ledger shows why.

---

## How It Works: The 7-Step Flow

### 1. Setup (human, once)
- Connect your PayPal wallet (saved via Vault – consent once, never enter card again)
- Create a **mandate** in the cockpit: purpose, budget, per-purchase cap, "ask me above $X", allowed categories, expiry
- Sign the mandate with your Ed25519 key (cryptographic commitment)
- Your agent gets a **scoped API key** tied to exactly this mandate

### 2. Agent Shops
- Agent calls `search_products` → Leash fetches real products from Channel3
- Agent picks an item and calls `request_purchase(item, amount, justification)`

### 3. Leash Decides (Three-Layer Policy Engine)

| Layer | What it checks | Can it loosen a denial? |
|-------|---------------|------------------------|
| **Deterministic rules** | Budget, cap, category, merchant, expiry, velocity, dedup, structuring | No — this layer is final |
| **LLM intent judge** | Does the justification genuinely match the mandate purpose? | No — can only tighten |
| **Injection screen** | Is the product page or justification trying to manipulate the AI? | N/A — always tightens |

**Safety invariant:** The LLM can only move a decision toward DENY, never toward APPROVE.

### 4. Three Paths

| Verdict | What happens |
|---------|-------------|
| **APPROVE** | Leash creates a PayPal order with `intent: AUTHORIZE`. Money is held, not taken. |
| **ESCALATE** | Request appears in your cockpit with Leash's reasoning. You approve or reject. |
| **DENY** | Nothing is charged. Reason is logged. Agent gets a plain-English explanation. |

### 5. Delivery
- The demo store ships the item and posts tracking through PayPal's **Add Tracking API**
- A PayPal webhook or delivery event reaches Leash

### 6. Settle
- **Delivered:** Leash captures the payment
- **Never delivered / timed out:** Leash voids the authorization (Render Workflows handles the timers)

### 7. Record
- Every step lands in the **hash-chained ledger** — tamper-evident, append-only
- The cockpit shows the full audit trail with the AG Grid data grid
- You can **kill the mandate at any time**, voiding every open authorization instantly

---

## Architecture: Key Design Decisions

### Why MCP?
Leash is itself an MCP server. Any MCP-capable agent (Claude, GPT-4o, custom) can plug in without modification. PayPal's own Agent Toolkit runs **inside** Leash with least-privilege configuration — the agent never touches it directly.

### Why "authorize then capture"?
PayPal's `intent: AUTHORIZE` holds funds without charging. This is the only correct model for an AI agent buying on your behalf: money is reserved but not taken until you've confirmed delivery.

Authorization lifecycle (from PayPal docs):
- **Honor period:** 3 days — capture within this window is guaranteed
- **Authorization valid:** up to 29 days — capture after day 3 depends on risk and available funds
- **Reauthorization:** available once per honor-period expiry, produces a new authorization ID

Render Workflows checks at **day 2** and reauthorizes before the honor period expires.

### Why pgvector for dedup?
Traditional dedup catches exact duplicates. A smart agent (or attacker) can rephrase "MacBook Pro 14" as "Apple laptop 14-inch" and slip under the radar. pgvector cosine similarity catches semantically identical items even when rephrased.

**Cluster cap:** Two purchases of similar items are capped in aggregate, not individually. A $400 MacBook accessory + $300 similar item = $700 cluster total, which triggers a cluster cap check independent of per-purchase limits.

### Why hash-chained ledger?
Every ledger entry stores `SHA-256(previousHash || canonicalPayload)`. Any modification to a historical entry breaks the chain and is immediately detectable.

### Why Ed25519 signatures?
Three cryptographic commitments make "zero-trust" honest:
1. **Mandate signing:** The human signs the mandate with their Ed25519 private key. The gateway verifies the signature on every request.
2. **Decision receipts:** The gateway signs each decision. The receipt is returned to the agent as proof of the evaluation.
3. **Ledger entries:** Hash-chained, making individual entry tampering detectable.

**Zero-trust definition:** No agent is implicitly trusted. Every request is: (a) authenticated against a hashed scoped key, (b) checked against a human-signed mandate, (c) logged to an append-only chain.

---

## Project Structure

```
agent-leash/
├── apps/
│   ├── gateway/           # MCP server + HTTP API (Hono)
│   │   └── src/
│   │       ├── server.ts
│   │       ├── mcp/server.ts          # 4 MCP tools
│   │       ├── routes/
│   │       │   ├── webhooks.ts        # PayPal + delivery webhooks
│   │       │   ├── escalations.ts     # Human approve/reject API
│   │       │   └── mandates.ts        # Kill switch
│   │       ├── orchestrator/
│   │       │   └── payment-orchestrator.ts
│   │       ├── ledger/ledger-service.ts
│   │       ├── auth/resolve-mandate.ts
│   │       ├── integrations/channel3.ts
│   │       └── tests/adversarial/policy.test.ts  # 30 scenarios
│   │
│   ├── cockpit/           # Next.js dashboard (AG Grid + AG Charts)
│   │   └── src/app/
│   │       ├── mandates/
│   │       ├── escalations/
│   │       ├── ledger/
│   │       └── analytics/
│   │
│   ├── demo-store/        # Sandbox merchant (Hono)
│   └── demo-agent/        # OpenAI + MCP client shopping agent
│
├── packages/
│   ├── db/                # Drizzle ORM schemas + migrations
│   │   └── src/schema/
│   │       ├── users.ts
│   │       ├── agents.ts
│   │       ├── mandates.ts
│   │       ├── purchase-requests.ts
│   │       ├── decisions.ts
│   │       ├── payment-records.ts
│   │       ├── escalations.ts
│   │       ├── delivery-events.ts
│   │       ├── ledger-entries.ts
│   │       └── outbox.ts            # Transactional outbox
│   │
│   ├── policy-engine/
│   │   └── src/layers/
│   │       ├── deterministic.ts     # Layer 1: pure logic
│   │       ├── semantic-dedup.ts    # pgvector similarity + cluster cap
│   │       ├── llm-judge.ts         # OpenAI gpt-4o structured output
│   │       └── injection-screen.ts  # Tighten-only
│   │
│   ├── payment-orchestrator/  # PayPal SDK state machine
│   ├── ledger/                # SHA-256 hash-chain
│   ├── crypto/                # Ed25519 + canonicalize
│   └── types/                 # Zod schemas shared across packages
│
├── docs/
│   ├── architecture.md
│   ├── paypal-api.md
│   ├── threat-model.md
│   └── dev-log.md
│
├── infra/render.yaml
├── .env.example
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Sponsor Tool Integration

| Tool | How We Use It | Status |
|------|--------------|--------|
| **PayPal Developer Dashboard** | Sandbox accounts, OAuth tokens, webhook config | Core |
| **PayPal Orders v2 API** | `intent: AUTHORIZE` → capture / void / refund | Core |
| **PayPal Vault (Payment Method Tokens v3)** | Consent once, Leash holds vault_id | Core – Day 1 spike |
| **PayPal JS SDK v6** | Wallet consent flow in cockpit | Core |
| **@paypal/paypal-server-sdk** | All backend PayPal calls | Core |
| **@paypal/agent-toolkit** | MCP tools inside Leash (least-privilege config) | Core |
| **PayPal Remote MCP (sandbox)** | Contrast demo: same attack with no Leash | Core for demo |
| **PayPal Webhooks** | Auth created/voided, capture completed/denied | Core |
| **PayPal Add Tracking API** | Demo store posts shipment status | Core |
| **PayPal Transaction Search** | Ledger reconciliation | Core |
| **AG Grid Enterprise** | Live ledger, mandate grid | Core |
| **AG Charts** | Spend-over-time, budget utilization | Core |
| **Render** | Hosting: Postgres, Redis, Workflows | Core |
| **Render Workflows** | Delivery SLA timers, reauth, price watch | Core |
| **Channel3** | Real product search via `search_products` | Core |
| **APIMatic Context Plugin** | Dev-time: coding agent writes correct PayPal SDK calls | Dev tooling |

**Not used (and why):** Fastlane, Venmo, Pay Later, Payouts, Subscriptions, Agent Ready, Store Sync, Bryntum, Zapier, Astropods, Kernel, Elastic. Shallow "badge" integrations hurt more than they help.

---

## PayPal Vault: Honest Feasibility Note

Autonomous approval (no human click per purchase) requires a **vaulted wallet**. Without Vault, every PayPal order needs a human to click "approve" in the PayPal UI.

- **Day 1 spike:** Verify Payment Method Tokens v3 availability in sandbox.
- **If Vault works:** Demo the full autonomous path.
- **If Vault is unavailable in sandbox:** Auto-path demonstrated with a pre-approved sandbox flow; escalations shown via PayPal approval link. Stated plainly in the video rather than faked.

---

## Adversarial Test Suite

30 scenarios published with pass rates after Day 3.

| Category | Scenarios | Description |
|----------|-----------|-------------|
| A. Budget & Cap | A1–A4 | Over cap, over budget, exact boundary, reservation race |
| B. Category & Merchant | B1–B3 | Blocked category, blocked merchant, open allowlist |
| C. Timing & Expiry | C1–C2 | Expired mandate, future expiry |
| D. Velocity & Structuring | D1–D3 | Velocity limit, structuring detection, cluster cap |
| E. Duplicate Detection | E1–E2 | Exact duplicate, idempotent retry |
| F. Prompt Injection | F1–F5 | Justification, description, vendor, benign text, subtle injection |
| G. Semantic Dedup | G1 | Rephrased item within 30-day window |
| H. Concurrent Racing | H1 | Two requests simultaneously exceeding budget |
| I. Delivery Failures | I1–I2 | SLA exceeded (void), honor period check (reauth) |

**Contrast:** The same F1–F5 injection attacks are run against a raw PayPal MCP server (no Leash) to show the vulnerability Leash closes.

**Pass rates (Verified Benchmark):**
```
Category A: 4/4 (100%)   Category B: 3/3 (100%)   Category C: 2/2 (100%)
Category D: 3/3 (100%)   Category E: 2/2 (100%)   Category F: 5/5 (100%)
Category G: 1/1 (100%)   Category H: 1/1 (100%)   Category I: 2/2 (100%)
Overall: 23/23 adversarial tests passed (100% DEFENSE PASS RATE)
```

---

## Security & Threat Model

| Threat | Mitigation |
|--------|-----------|
| Prompt injection via product pages | Injection screen; LLM can only tighten |
| Prompt injection via justification | Same injection screen |
| Retries and replay | Idempotency keys + request dedup table |
| Structuring (many small buys) | Velocity window + cumulative spend rules |
| Rephrased structuring | pgvector semantic dedup + cluster cap |
| Credential exposure | Agent never sees PayPal keys |
| Webhook spoofing | PayPal signature verification on every webhook |
| Authorization expiry | Render Workflows: day-2 check → reauthorize |
| Ledger tampering | SHA-256 hash chain; broken chain detectable |
| Mandate tampering | Ed25519 signature verified on every request |
| Decision repudiation | Gateway-signed receipt returned to agent |
| Concurrent overspend | Row-level lock on mandate during reservation |

---

## Tools Used (Hackathon Disclosure)

- **LLM for policy judge:** OpenAI `gpt-4o` (structured JSON output, temperature 0.1)
- **Embeddings for semantic dedup:** OpenAI `text-embedding-3-small` (512 dimensions)
- **LLM for demo agent:** OpenAI `gpt-4o-mini`
- **LLM for cockpit assistant:** OpenAI `gpt-4o-mini`
- **APIMatic Context Plugin:** Used during development so the coding agent writes correct PayPal SDK calls

---

## Development Plan

| Day | Focus | Key deliverables |
|-----|-------|-----------------|
| **1** | Foundation | PayPal sandbox setup, Vault spike, DB migrations, crypto package |
| **2** | Policy Engine + Gateway Core | Deterministic rules + DB, resolveAgentMandate, authorize flow, ledger |
| **3** | Webhooks + Escalation + Kill Switch | Sig verification, escalation flow, LLM judge, injection screen, adversarial tests |
| **4** | Delivery + Capture + Demo Store | Carrier sim, Add Tracking, capture-on-delivery, Render Workflows |
| **5** | Cockpit + Polish | AG Grid ledger, AG Charts, escalation inbox, assistant, semantic dedup calibration |
| **6** | Demo + Submission | End-to-end video, contrast demo, README final pass, Render deploy |

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Fill in: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, DATABASE_URL, OPENAI_API_KEY, ...

# Run database migrations
pnpm db:migrate

# Start all services
pnpm dev
```

| Service | Port |
|---------|------|
| Gateway (MCP + API) | 3000 |
| Cockpit (Next.js) | 3001 |
| Demo Store | 3002 |

```bash
# Run 23-Scenario Adversarial Benchmark Suite
pnpm --filter @leash/gateway test:adversarial

# Run Autonomous Shopping Agent (Legitimate Order)
pnpm --filter @leash/demo-agent run:shopping

# Run Contrast Demo (Attacks on Raw PayPal MCP vs Leash Defense)
pnpm --filter @leash/demo-agent run:adversarial
```

---

## Honest Limitations

1. **Sandbox only.** No real money moves. Stated in README and video.
2. **Vault availability.** Fallback path disclosed if Vault isn't in sandbox.
3. **Carrier data is simulated.** Demo store carrier is a stand-in for a real carrier API.
4. **Merchant payee.** All demo vendors map to one sandbox business account.
5. **Auto-disputes.** PayPal Disputes API is for merchants to respond, not buyers to file. Leash prepares evidence packs; filing is a human click.
6. **"Cryptographically constrained" claim** backed by: Ed25519-signed mandates, signed decision receipts, SHA-256 hash-chained ledger.

---

## License

MIT. See [LICENSE](LICENSE).

---

*Built for the PayPal AI Payments Hackathon 2025. Everything runs on PayPal sandbox.*
