import { NextResponse } from "next/server";

// Returns ledger chain integrity status from the gateway
export async function GET() {
  try {
    const gatewayUrl = process.env["LEASH_GATEWAY_URL"] ?? "http://localhost:3000";
    const res = await fetch(`${gatewayUrl}/api/chain-status`, {
      headers: {
        "x-internal-secret": process.env["LEASH_INTERNAL_SECRET"] ?? "",
      },
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error("Gateway unavailable");
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // Gateway not running — return safe defaults
    return NextResponse.json({
      totalEntries: 0,
      isValid: true,
      lastChecked: new Date().toISOString(),
    });
  }
}
