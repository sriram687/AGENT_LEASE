/**
 * Layer 2b (Elastic): Semantic Deduplication via Elasticsearch
 *
 * Sponsor: Elastic — https://www.elastic.co/
 * Uses Elasticsearch semantic_text field + hybrid BM25/dense search to detect
 * near-duplicate purchase requests within a 30-day rolling window.
 *
 * Advantages over pgvector:
 * - Elastic manages embeddings natively (ELSER model) — no external embedding API needed
 * - Hybrid BM25 + dense vector search for better precision/recall
 * - Full-text keyword matching catches exact rephrases that cosine similarity misses
 * - Scales to millions of purchase history records with native sharding
 *
 * Fallback: When ELASTIC_URL is not set, falls back to pgvector dedup automatically.
 */
import { Client } from "@elastic/elasticsearch";
import type { Mandate } from "@leash/db";
import type { RequestPurchaseInput } from "@leash/types";

const INDEX_NAME = "leash_purchase_requests";

let _client: Client | null = null;

export function getElasticClient(): Client | null {
  const url = process.env["ELASTIC_URL"];
  const apiKey = process.env["ELASTIC_API_KEY"];
  if (!url) return null;
  if (!_client) {
    _client = new Client({
      node: url,
      ...(apiKey ? { auth: { apiKey } } : {}),
    });
  }
  return _client;
}

export async function ensurePurchaseRequestIndex(client: Client): Promise<void> {
  const exists = await client.indices.exists({ index: INDEX_NAME });
  if (exists) return;

  await client.indices.create({
    index: INDEX_NAME,
    mappings: {
      properties: {
        mandateId: { type: "keyword" },
        requestId: { type: "keyword" },
        itemName: { type: "text" },
        // semantic_text field: Elastic ELSER model generates embeddings automatically
        itemNameSemantic: {
          type: "semantic_text",
          inference_id: ".elser-2-elasticsearch",
        },
        amountCents: { type: "integer" },
        status: { type: "keyword" },
        requestedAt: { type: "date" },
      },
    },
  });
}

export async function indexPurchaseRequestInElastic(params: {
  requestId: string;
  mandateId: string;
  itemName: string;
  amountCents: number;
  status: string;
  requestedAt: Date;
}): Promise<void> {
  const client = getElasticClient();
  if (!client) return;
  try {
    await ensurePurchaseRequestIndex(client);
    await client.index({
      index: INDEX_NAME,
      id: params.requestId,
      document: {
        mandateId: params.mandateId,
        requestId: params.requestId,
        itemName: params.itemName,
        itemNameSemantic: params.itemName, // ELSER auto-embeds this field
        amountCents: params.amountCents,
        status: params.status,
        requestedAt: params.requestedAt.toISOString(),
      },
      refresh: true,
    });
  } catch (err) {
    console.warn("[Elastic] indexPurchaseRequest failed (non-fatal):", err);
  }
}

export async function runElasticSemanticDedup(
  input: RequestPurchaseInput,
  mandate: Mandate
): Promise<{ requestId: string; similarity: number } | null> {
  const client = getElasticClient();
  if (!client) return null;

  try {
    await ensurePurchaseRequestIndex(client);

    const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const threshold = Number(mandate.dedupSimilarityThreshold ?? 0.85);

    const semanticQuery = `${input.itemName} ${input.itemDescription ?? ""}`.trim();

    // Hybrid query: semantic (ELSER dense vector) + BM25 keyword
    const response = await client.search({
      index: INDEX_NAME,
      query: {
        bool: {
          must: [
            { term: { mandateId: mandate.id } },
            {
              range: {
                requestedAt: {
                  gte: windowStart.toISOString(),
                },
              },
            },
          ],
          must_not: [
            { terms: { status: ["DENIED", "REJECTED", "VOIDED"] } },
          ],
          should: [
            // Semantic (ELSER)
            {
              semantic: {
                field: "itemNameSemantic",
                query: semanticQuery,
              },
            },
            // BM25 keyword fallback
            {
              match: {
                itemName: {
                  query: input.itemName,
                  boost: 0.3,
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
      size: 1,
      _source: ["requestId", "amountCents", "status"],
    });

    const hit = response.hits.hits[0];
    if (!hit) return null;

    // Normalize score: Elastic scores are unbounded; cap at 1.0
    const maxScore = response.hits.max_score ?? 1;
    const normalizedScore = Math.min((hit._score ?? 0) / maxScore, 1.0);

    if (normalizedScore < threshold) return null;

    const source = hit._source as { requestId: string; amountCents: number };

    // Cluster cap check
    if (mandate.clusterBudgetCapCents != null) {
      const clusterTotal = await getElasticClusterTotal(
        client,
        mandate.id,
        input.itemName,
        windowStart
      );
      if (clusterTotal + input.amountCents > mandate.clusterBudgetCapCents) {
        return { requestId: source.requestId, similarity: normalizedScore };
      }
      return null; // Under cluster cap — not a duplicate concern
    }

    return { requestId: source.requestId, similarity: normalizedScore };
  } catch (err) {
    console.warn("[Elastic] runElasticSemanticDedup failed (falling back to pgvector):", err);
    return null;
  }
}

async function getElasticClusterTotal(
  client: Client,
  mandateId: string,
  itemName: string,
  windowStart: Date
): Promise<number> {
  try {
    const response = await client.search({
      index: INDEX_NAME,
      query: {
        bool: {
          must: [
            { term: { mandateId } },
            { range: { requestedAt: { gte: windowStart.toISOString() } } },
          ],
          must_not: [{ terms: { status: ["DENIED", "REJECTED", "VOIDED"] } }],
          should: [
            {
              semantic: {
                field: "itemNameSemantic",
                query: itemName,
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
      aggs: {
        cluster_total: { sum: { field: "amountCents" } },
      },
      size: 0,
    });

    return (response.aggregations?.cluster_total as { value: number } | undefined)?.value ?? 0;
  } catch {
    return 0;
  }
}
