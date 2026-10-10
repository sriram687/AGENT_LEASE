# PayPal API Usage Notes

## APIs Used in Agent Leash

### Orders v2 API
- **Endpoint:** POST `/v2/checkout/orders`
- **Intent:** Always `AUTHORIZE` (never `CAPTURE` directly)
- **Idempotency:** `PayPal-Request-Id` header on every call
- **Key operations:**
  - `createOrder`: intent=AUTHORIZE, amount, currency, payee
  - `authorizeOrder`: POST `/v2/checkout/orders/{id}/authorize`
  - `captureAuthorization`: POST `/v2/payments/authorizations/{id}/capture`
  - `voidAuthorization`: POST `/v2/payments/authorizations/{id}/void`
  - `getOrder`: GET `/v2/checkout/orders/{id}`

### Payment Method Tokens v3 (Vault)
- **Endpoint:** POST `/v3/vault/payment-tokens`
- **Purpose:** User consents once; Leash stores `vault_id` in `users.vault_id`
- **Sandbox note:** Verify availability on Day 1. Required for autonomous flow.
- **Fallback:** If unavailable, use pre-approved sandbox flow and say so in video.

### Webhooks
- **Events to subscribe:**
  - `PAYMENT.AUTHORIZATION.CREATED`
  - `PAYMENT.AUTHORIZATION.VOIDED`
  - `PAYMENT.CAPTURE.COMPLETED`
  - `PAYMENT.CAPTURE.DENIED`
  - `PAYMENT.CAPTURE.REFUNDED`
- **Signature verification headers:**
  - `PAYPAL-TRANSMISSION-ID`
  - `PAYPAL-TRANSMISSION-TIME`
  - `PAYPAL-CERT-URL`
  - `PAYPAL-TRANSMISSION-SIG`
  - `PAYPAL-AUTH-ALGO`

### Add Tracking API
- **Endpoint:** POST `/v1/shipping/trackers-batch`
- **Purpose:** Demo store posts tracking after shipping
- **Fields:** tracking_number, carrier, capture_id, status

### Transaction Search
- **Endpoint:** GET `/v1/reporting/transactions`
- **Purpose:** Reconcile ledger against PayPal's records
- **Fields:** transaction_id, amount, status, create_time

### PayPal Agent Toolkit (@paypal/agent-toolkit)
- **Config:** restrict to only needed actions via `actions` object
- **Least-privilege config for Leash:**
```typescript
import { PayPalAgentToolkit } from "@paypal/agent-toolkit/ai-sdk";

const toolkit = new PayPalAgentToolkit({
  clientId: process.env.PAYPAL_CLIENT_ID,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET,
  configuration: {
    actions: {
      orders: { create: true, get: true, authorize: true, capture: true, void: true },
      payments: { get: true },
      // Everything else: false (not set = disabled)
    },
  },
});
```

### Disputes API
- **Scope:** Merchant-side only (demo store responds to disputes)
- **Leash does NOT file disputes** — PayPal's API doesn't support buyer-initiated filing
- **What Leash does instead:**
  - Before capture: void the authorization on SLA miss
  - After capture: prepare evidence pack, deep-link to Resolution Center
  - Demo store: responds to disputes via GET/POST `/v1/customer/disputes/{id}`

## Authorization Timing Notes

```
Day 0: Authorization created
Day 3: Honor period ends (capture after this depends on risk)
Day 2: Leash Render Workflow fires → check delivery → reauthorize if not delivered
Day 29: Authorization expires → void if not captured
```

**Render Workflow schedule:**
- T+48h: check delivery status
  - If DELIVERED: capture
  - If NOT_DELIVERED: reauthorize (creates new authorization_id)
- T+168h (7 days): if still not delivered, void and notify human
