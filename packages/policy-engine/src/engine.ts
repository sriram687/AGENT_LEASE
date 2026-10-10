/**
 * PolicyEngine
 *
 * Orchestrates the three-layer evaluation pipeline:
 *   1. Deterministic rules  – fast, always runs first
 *   2. Semantic dedup       – pgvector similarity check
 *   3. LLM intent judge     – only runs if rules pass or yield ESCALATED
 *   4. Injection screen     – wraps LLM, can only tighten decisions
 *
 * Safety invariant: the LLM can only tighten a decision (APPROVE → ESCALATE → DENY).
 * A deterministic DENY is final and the LLM is never called for it.
 */
import type { DB } from "@leash/db";
import type {
  PolicyDecision,
  RequestPurchaseInput,
} from "@leash/types";
import type { Mandate } from "@leash/db";
import { runDeterministicRules } from "./layers/deterministic.js";
import { runLLMJudge } from "./layers/llm-judge.js";
import { runInjectionScreen } from "./layers/injection-screen.js";
import { runSemanticDedup } from "./layers/semantic-dedup.js";

export class PolicyEngine {
  constructor(private readonly db: DB) {}

  async evaluate(
    input: RequestPurchaseInput,
    mandate: Mandate
  ): Promise<PolicyDecision> {
    // ─── Layer 1: Deterministic rules ────────────────────────────────
    const ruleResults = await runDeterministicRules(input, mandate, this.db);

    // Hard deny: skip all subsequent layers to avoid leaking context to LLM
    if (ruleResults.failedRules.length > 0) {
      const failedRuleNames = ruleResults.failedRules.join(", ");
      return {
        verdict: "DENIED",
        ruleResults,
        llmOutput: null,
        injectionDetected: false,
        plainReason: `Denied by policy rules: ${failedRuleNames}.`,
      };
    }

    // ─── Layer 2: Semantic deduplication ─────────────────────────────
    const dedupResult = await runSemanticDedup(input, mandate, this.db);
    if (dedupResult) {
      ruleResults.semanticDedupMatch = dedupResult;
      // Dedup match → escalate (don't deny outright; human decides)
      return {
        verdict: "ESCALATED",
        ruleResults,
        llmOutput: null,
        injectionDetected: false,
        plainReason: `Similar purchase detected (similarity ${(dedupResult.similarity * 100).toFixed(0)}%). Escalating for human review.`,
      };
    }

    // ─── Layer 3: LLM intent judge ────────────────────────────────────
    const llmOutput = await runLLMJudge(input, mandate);

    // ─── Layer 4: Injection screen (wraps LLM output) ─────────────────
    const { injectionDetected, injectionDetails, tightenedVerdict } =
      await runInjectionScreen(input, llmOutput);

    // Final verdict = most restrictive of LLM + injection screen
    const finalVerdict = tightenedVerdict ?? llmOutput.verdict;

    return {
      verdict: finalVerdict,
      ruleResults,
      llmOutput,
      injectionDetected,
      injectionDetails,
      plainReason: injectionDetected
        ? `Prompt injection suspected. Original reason: ${llmOutput.reason}`
        : llmOutput.reason,
    };
  }
}
