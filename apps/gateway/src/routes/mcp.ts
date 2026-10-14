/**
 * MCP Router – Placeholder
 *
 * This will eventually host the MCP SSE transport endpoint
 * for agent connections. For now, it returns a stub response.
 */
import { Hono } from "hono";

export const mcpRouter = new Hono();

mcpRouter.post("/", async (c) => {
  return c.json(
    {
      error: "MCP endpoint not yet implemented",
      message: "The MCP transport layer is under development.",
    },
    501
  );
});

mcpRouter.get("/", async (c) => {
  return c.json({
    status: "mcp_endpoint_placeholder",
    message: "MCP SSE transport will be available here.",
  });
});
