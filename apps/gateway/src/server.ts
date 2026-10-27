/**
 * Gateway HTTP Server
 *
 * Exposes:
 *  - POST /mcp              – MCP SSE transport endpoint (agent connections)
 *  - POST /webhooks/paypal  – PayPal webhook receiver (signature verified)
 *  - POST /webhooks/delivery – Demo store delivery events
 *  - GET  /health           – Health check for Render
 *  - POST /api/escalations/:id/approve – Human cockpit approve/reject
 *  - POST /api/mandates/:id/revoke     – Kill switch
 *
 * Auth:
 *  - MCP connections: Bearer <agent_api_key> in Authorization header
 *  - Cockpit API: NextAuth session cookie verified via shared secret
 *  - Webhooks: PayPal PAYPAL-TRANSMISSION-SIG header verified
 */
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { mcpRouter } from "./routes/mcp.js";
import { webhookRouter } from "./routes/webhooks.js";
import { escalationRouter } from "./routes/escalations.js";
import { mandateRouter } from "./routes/mandates.js";
import { purchaseRouter } from "./routes/purchase.js";

function loadEnv() {
  const envPaths = [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")];
  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [k, ...v] = trimmed.split("=");
        if (k && !process.env[k.trim()]) {
          process.env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
        }
      }
      break;
    }
  }
}
loadEnv();

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok", service: "leash-gateway" }));

app.route("/mcp", mcpRouter);
app.route("/webhooks", webhookRouter);
app.route("/api/escalations", escalationRouter);
app.route("/api/mandates", mandateRouter);
app.route("/api/purchase", purchaseRouter);

const port = Number(process.env["PORT"] ?? 3000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`🔗 Leash Gateway running on port ${port}`);
});
