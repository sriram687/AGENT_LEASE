import { NextRequest, NextResponse } from "next/server";

const PAYPAL_API_BASE =
  process.env["PAYPAL_BASE_URL"] ?? "https://api-m.sandbox.paypal.com";

/**
 * GET /api/paypal/callback
 *
 * PayPal redirects here after the user logs in via OAuth Connect.
 * Query params: ?code=<AUTH_CODE>&state=<STATE>
 *
 * This route:
 * 1. Receives the authorization code from PayPal
 * 2. Redirects to /settings with the code as a query param
 *    (the client-side component finishes the exchange via server action)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cockpitUrl =
    process.env["NEXTAUTH_URL"] ??
    process.env["COCKPIT_URL"] ??
    "http://localhost:3001";

  if (error || !code) {
    return NextResponse.redirect(`${cockpitUrl}/settings?vault=cancelled&reason=${error ?? "no_code"}`);
  }

  // Forward the code to the settings page — the client component will exchange it
  return NextResponse.redirect(`${cockpitUrl}/settings?vault=success&code=${encodeURIComponent(code)}&state=${state ?? ""}`);
}
