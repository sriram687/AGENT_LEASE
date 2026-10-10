/**
 * Layer 2b: Semantic Deduplication
 *
 * Uses pgvector cosine similarity to detect near-duplicate purchases within
 * a configurable time window. Addresses "structuring by rephrase" attacks.
 *
 * Cluster cap: tracks cumulative spend per item cluster (items with similarity
 * above threshold). If the cluster total would exceed the cluster budget cap,
 * the request is escalated.
 *
 * Stack: Postgres + pgvector (hybrid BM25 + dense search available via pg_trgm).
 * Embedding model: text-embedding-3-small (OpenAI).
 *
 * Precision/recall calibration: threshold is configurable per mandate.
 * Default: 0.85. Tune on eval set and publish numbers in README.
 */
import OpenAI from "openai";
import type { DB } from "@leash/db";
import { purchaseRequests } from "@leash/db";
import type { Mandate } from "@leash/db";
import type { RequestPurchaseInput } from "@leash/types";
import { eq, sql, and } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    dimensions: 512, // Reduced for pgvector performance
  });
  return response.data[0]!.embedding;
}

export async function runSemanticDedup(
  input: RequestPurchaseInput,
  mandate: Mandate,
  db: DB
): Promise<{ requestId: string; similarity: number } | null> {
  // Generate embedding for the candidate item
  const candidateText = `${input.itemName} ${input.itemDescription ?? ""}`.trim();
  const embedding = await generateEmbedding(candidateText);

  // NOTE: The actual pgvector query uses <=> (cosine distance) operator.
  // Migration must CREATE EXTENSION vector; and add a vector column to purchase_requests.
  // This is a placeholder until the migration is applied.
  // See: packages/db/migrations/0002_add_pgvector.sql

  const threshold = Number(mandate.dedupSimilarityThreshold);
  const windowDays = 30;
  const windowStart = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  );

  // Raw SQL for pgvector similarity (Drizzle doesn't natively support <=> yet)
  const results = await db.execute(sql`
    SELECT 
      id,
      item_name,
      amount_cents,
      1 - (item_embedding::vector <=> ${JSON.stringify(embedding)}::vector) AS similarity
    FROM purchase_requests
    WHERE 
      mandate_id = ${mandate.id}
      AND requested_at >= ${windowStart.toISOString()}
      AND status NOT IN ('DENIED', 'REJECTED', 'VOIDED')
      AND item_embedding IS NOT NULL
    ORDER BY similarity DESC
    LIMIT 1
  `);

  const topMatch = results.rows[0] as
    | { id: string; similarity: number; amount_cents: number }
    | undefined;

  if (!topMatch || topMatch.similarity < threshold) {
    return null;
  }

  // Cluster cap check: sum of spend in this cluster
  if (mandate.clusterBudgetCapCents != null) {
    const clusterTotal = await db.execute(sql`
      SELECT COALESCE(SUM(pr.amount_cents), 0) AS cluster_total
      FROM purchase_requests pr
      WHERE
        pr.mandate_id = ${mandate.id}
        AND pr.requested_at >= ${windowStart.toISOString()}
        AND pr.status NOT IN ('DENIED', 'REJECTED', 'VOIDED')
        AND pr.item_embedding IS NOT NULL
        AND 1 - (pr.item_embedding::vector <=> ${JSON.stringify(embedding)}::vector) >= ${threshold}
    `);
    const existingClusterTotal = Number(
      (clusterTotal.rows[0] as { cluster_total: number } | undefined)
        ?.cluster_total ?? 0
    );
    if (
      existingClusterTotal + input.amountCents >
      mandate.clusterBudgetCapCents
    ) {
      return { requestId: topMatch.id, similarity: topMatch.similarity };
    }
  }

  return { requestId: topMatch.id, similarity: topMatch.similarity };
}
