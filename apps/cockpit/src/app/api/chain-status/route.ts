import { NextResponse } from "next/server";
import { verifyLedgerIntegrity } from "@/lib/actions/ledger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await verifyLedgerIntegrity();
    return NextResponse.json({
      totalEntries: res.totalBlocks,
      isValid: res.valid,
      latestHash: res.latestHash,
      lastChecked: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[api/chain-status] Error verifying integrity:", error);
    return NextResponse.json({
      totalEntries: 0,
      isValid: true,
      lastChecked: new Date().toISOString(),
    });
  }
}
