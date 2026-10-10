/**
 * Channel3 Integration
 *
 * Proxies product search to Channel3's API.
 * The agent never talks to Channel3 directly – all calls go through Leash.
 *
 * TODO: Check Channel3's Devpost resources page for:
 *   - Base URL
 *   - Authentication method
 *   - Rate limits
 *   - Response schema
 *
 * Placeholder returns mock data until Day 2 research is complete.
 */
import type { SearchProductsInput } from "@leash/types";

const CHANNEL3_BASE_URL = process.env["CHANNEL3_BASE_URL"] ?? "https://api.channel3.ai";
const CHANNEL3_API_KEY = process.env["CHANNEL3_API_KEY"] ?? "";

export interface Channel3Product {
  id: string;
  name: string;
  description: string;
  vendor: string;
  vendorId: string;
  category: string;
  priceCents: number;
  currency: string;
  imageUrl?: string;
  productUrl?: string;
  metadata?: Record<string, unknown>;
}

export async function searchChannel3Products(
  input: SearchProductsInput
): Promise<Channel3Product[]> {
  if (!CHANNEL3_API_KEY) {
    console.warn("CHANNEL3_API_KEY not set – returning mock products");
    return getMockProducts(input.query);
  }

  // TODO Day 2: Implement actual Channel3 API call
  // Verify: endpoint, auth header name, query params
  const params = new URLSearchParams({
    q: input.query,
    limit: String(input.maxResults),
    ...(input.category && { category: input.category }),
    ...(input.maxPriceCents && { max_price: String(input.maxPriceCents / 100) }),
  });

  const response = await fetch(`${CHANNEL3_BASE_URL}/search?${params}`, {
    headers: {
      Authorization: `Bearer ${CHANNEL3_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    console.error(`Channel3 API error: ${response.status}`);
    return getMockProducts(input.query);
  }

  const data = await response.json();
  // TODO: Transform Channel3 response to Channel3Product[]
  return data as Channel3Product[];
}

function getMockProducts(query: string): Channel3Product[] {
  return [
    {
      id: "mock-001",
      name: `${query} – Sample Product A`,
      description: "High quality office product",
      vendor: "OfficeDepot",
      vendorId: "offcedepot-us",
      category: "office_supplies",
      priceCents: 1999,
      currency: "USD",
    },
    {
      id: "mock-002",
      name: `${query} – Sample Product B`,
      description: "Budget-friendly alternative",
      vendor: "Staples",
      vendorId: "staples-us",
      category: "office_supplies",
      priceCents: 1299,
      currency: "USD",
    },
  ];
}
