import { NextRequest, NextResponse } from "next/server";
import { confirmVaultToken } from "@/lib/actions/paypal";

const BASE =
  process.env["NEXTAUTH_URL"] ??
  process.env["COCKPIT_URL"] ??
  "http://localhost:3001";

/**
 * GET /api/paypal/vault-return
 *
 * PayPal redirects here after the user approves vaulting their payment method
 * in the PayPal popup. Query params include ?approval_token_id=<TOKEN>
 *
 * Flow:
 *  1. Read the setup/approval token from query params
 *  2. Call confirmVaultToken() to exchange it for a permanent vault payment token
 *  3. Store the token in DB
 *  4. Redirect to /settings?vault=success or ?vault=error
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // PayPal passes approval_token_id after the user approves
  const approvalTokenId =
    searchParams.get("approval_token_id") ??
    searchParams.get("token") ??
    searchParams.get("ba_token");

  const errorMsg = searchParams.get("error");

  if (errorMsg || !approvalTokenId) {
    console.error("[vault-return] No approval token or error:", errorMsg);
    return NextResponse.redirect(
      `${BASE}/settings?vault=cancelled&reason=${encodeURIComponent(errorMsg ?? "no_token")}`
    );
  }

  console.log("[vault-return] Received approval token:", approvalTokenId.slice(0, 20));

  const result = await confirmVaultToken(approvalTokenId);

  if (!result.success) {
    console.error("[vault-return] confirmVaultToken failed:", result.error);
    return NextResponse.redirect(
      `${BASE}/settings?vault=error&reason=${encodeURIComponent(result.error ?? "confirmation_failed")}`
    );
  }

  const params = new URLSearchParams({
    vault: "success",
    token: result.paymentTokenId ?? "",
    email: result.email ?? "",
  });

  return NextResponse.redirect(`${BASE}/settings?${params.toString()}`);
}
