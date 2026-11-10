/**
 * Channel3 Product Search Route
 *
 * GET /api/channel3/search?q=<query>&limit=<n>&category=<cat>
 *
 * Sponsor: Channel3 — https://channel3.ai
 * 100M+ product catalog API. Agents use this to discover and price
 * products before submitting purchase requests through the Leash.
 *
 * The gateway proxies all Channel3 calls — agents never get the API key.
 * This enforces consistent audit logging of product discovery.
 */
import { Hono } from "hono";
import { searchChannel3Products } from "../integrations/channel3.js";

export const channel3Router = new Hono();

channel3Router.get("/search", async (c) => {
  const q = c.req.query("q");
  const limit = Number(c.req.query("limit") ?? "10");
  const category = c.req.query("category");
  const maxPriceCents = c.req.query("maxPrice")
    ? Number(c.req.query("maxPrice")) * 100
    : undefined;

  if (!q) {
    return c.json({ error: "Missing required query param: q" }, 400);
  }

  try {
    const products = await searchChannel3Products({
      query: q,
      maxResults: Math.min(limit, 50),
      ...(category !== undefined ? { category } : {}),
      ...(maxPriceCents !== undefined ? { maxPriceCents } : {}),
    });

    return c.json({
      query: q,
      count: products.length,
      products,
      sponsor: "Channel3 — https://channel3.ai",
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

channel3Router.post("/search", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { query, maxResults = 10, category, maxPriceCents } = body;

  if (!query) {
    return c.json({ error: "Missing required field: query" }, 400);
  }

  try {
    const products = await searchChannel3Products({
      query,
      maxResults: Math.min(maxResults, 50),
      ...(category !== undefined ? { category } : {}),
      ...(maxPriceCents !== undefined ? { maxPriceCents } : {}),
    });

    return c.json({
      query,
      count: products.length,
      products,
      sponsor: "Channel3 — https://channel3.ai",
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

