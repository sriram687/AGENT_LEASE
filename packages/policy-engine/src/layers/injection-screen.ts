/**
 * Layer 3 / 4: Injection Screen
 *
 * Scans untrusted inputs (item name, description, justification) for prompt injection patterns.
 * Can only TIGHTEN a verdict: APPROVE → ESCALATE → DENY. Never loosens.
 *
 * Two-phase approach:
 *   Phase A: Fast regex heuristics (catches obvious injection patterns)
 *   Phase B: LLM reflection check (catches subtle injections the LLM judge may have missed)
 *
 * If injection is detected, the verdict is tightened to DENIED regardless of LLM output.
 */
import type { LLMJudgeOutput, DecisionVerdict, RequestPurchaseInput } from "@leash/types";

// Obvious injection patterns (case-insensitive)
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(previous|prior|above|all)\s+instructions?/i,
  /override\s+(policy|rules?|mandate)/i,
  /you\s+are\s+now\s+a/i,
  /system\s+prompt/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
  /disregard\s+(the|all|your)/i,
  /act\s+as\s+(if\s+you\s+are|a|an)/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /pretend\s+(you|that)/i,
  /forget\s+(your|all)\s+(instructions?|training)/i,
];

function checkHeuristics(text: string): { detected: boolean; pattern?: string } {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return { detected: true, pattern: pattern.toString() };
    }
  }
  return { detected: false };
}

/** Tighten a verdict: APPROVE can become ESCALATE or DENY; ESCALATE can become DENY; DENY stays DENY */
function tighten(
  current: DecisionVerdict,
  injected: DecisionVerdict
): DecisionVerdict {
  const rank: Record<DecisionVerdict, number> = {
    APPROVED: 0,
    ESCALATED: 1,
    DENIED: 2,
  };
  return rank[injected]! > rank[current]! ? injected : current;
}

export async function runInjectionScreen(
  input: RequestPurchaseInput,
  llmOutput: LLMJudgeOutput
): Promise<{
  injectionDetected: boolean;
  injectionDetails?: string;
  tightenedVerdict: DecisionVerdict | null;
}> {
  const textToScan = [
    input.itemName,
    input.itemDescription ?? "",
    input.justification,
    input.vendorName,
  ].join(" ");

  // Phase A: Heuristic regex scan
  const heuristicResult = checkHeuristics(textToScan);

  // If LLM itself flagged injection, treat as detected
  const detected =
    heuristicResult.detected || llmOutput.injectionSuspected;

  if (!detected) {
    return { injectionDetected: false, tightenedVerdict: null };
  }

  const details = heuristicResult.detected
    ? `Heuristic match: ${heuristicResult.pattern}`
    : "LLM judge flagged potential injection in input text.";

  // Tighten verdict to DENIED on injection
  const tightenedVerdict = tighten(llmOutput.verdict, "DENIED");

  return {
    injectionDetected: true,
    injectionDetails: details,
    tightenedVerdict,
  };
}
