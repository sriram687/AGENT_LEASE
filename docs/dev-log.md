# Development Log

## Day 0 – Scaffold (2026-10-10)
- Created pnpm monorepo with Turbo
- Packages: `@leash/db`, `@leash/types`, `@leash/policy-engine`, `@leash/payment-orchestrator`, `@leash/ledger`, `@leash/crypto`
- Apps: `gateway`, `cockpit`, `demo-store`, `demo-agent`
- Full Drizzle schema for all 10 tables
- Deterministic rules layer (Layer 1) implemented
- LLM judge (Layer 2) skeleton with OpenAI structured output
- Injection screen (Layer 3/4) with regex heuristics
- Semantic dedup (pgvector) stub awaiting Day 1 DB setup
- Crypto package: Ed25519 key pairs, signing, hash-chaining
- 30-scenario adversarial test suite (unit test stubs, ready to wire to real DB)
- README, architecture docs, PayPal API reference, render.yaml

## TODO Day 1
- [ ] PayPal sandbox: create business + personal accounts
- [ ] Vault spike: test Payment Method Tokens v3 in sandbox
- [ ] Render: provision Postgres + pgvector, Redis
- [ ] Run `pnpm db:migrate` and verify schema
- [ ] Test crypto package: generate key pair, sign mandate, verify
- [ ] Channel3: find API docs on Devpost resources page
- [ ] APIMatic: install context plugin, verify correct PayPal SDK code generation
