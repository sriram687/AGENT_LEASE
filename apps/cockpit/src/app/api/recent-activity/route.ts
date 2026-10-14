import { NextResponse } from "next/server";

// Returns recent purchase request decisions from the gateway
export async function GET() {
  try {
    const gatewayUrl = process.env["LEASH_GATEWAY_URL"] ?? "http://localhost:3000";
    const res = await fetch(`${gatewayUrl}/api/recent-activity`, {
      headers: {
        "x-internal-secret": process.env["LEASH_INTERNAL_SECRET"] ?? "",
      },
      next: { revalidate: 10 },
    });
    if (!res.ok) return NextResponse.json([]);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // Gateway not running — return empty list
    return NextResponse.json([]);
  }
}
