"use server";

import { db } from "@leash/db";
import { users } from "@leash/db";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

const PAYPAL_API_BASE =
  process.env["PAYPAL_API_BASE"] ?? "https://api-m.sandbox.paypal.com";

/**
 * 1. Generate OAuth2 Access Token for PayPal REST API
 */
async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env["PAYPAL_CLIENT_ID"];
  const clientSecret = process.env["PAYPAL_CLIENT_SECRET"];

  if (!clientId || !clientSecret) {
    throw new Error("Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to obtain PayPal access token: ${errorBody}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * 2. Create a Setup Token for Vaulting
 * Endpoint: POST /v3/vault/setup-tokens
 */
export async function createVaultSetupToken(): Promise<{
  success: boolean;
  setupToken?: string | undefined;
  approveUrl?: string | undefined;
  error?: string | undefined;
}> {
  try {
    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_API_BASE}/v3/vault/setup-tokens`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payment_source: {
          paypal: {
            usage_type: "MERCHANT",
            experience_context: {
              brand_name: "Agent Leash",
              locale: "en-US",
              return_url: `${process.env["NEXTAUTH_URL"] ?? "http://localhost:3001"}/settings`,
              cancel_url: `${process.env["NEXTAUTH_URL"] ?? "http://localhost:3001"}/settings`,
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: `PayPal Setup Token Error: ${err}` };
    }

    const data = (await response.json()) as {
      id: string;
      links?: Array<{ href: string; rel: string; method: string }>;
    };

    const approveLink = data.links?.find(
      (l) => l.rel === "approve" || l.rel === "payer-action"
    )?.href;

    return {
      success: true,
      setupToken: data.id,
      approveUrl: approveLink,
    };
  } catch (error: any) {
    console.error("[createVaultSetupToken]", error);
    return { success: false, error: error.message ?? "Internal error" };
  }
}

/**
 * 3. Exchange Setup Token for a Permanent Payment Token (vault_id)
 * Endpoint: POST /v3/vault/payment-tokens
 */
export async function saveVaultPaymentToken(
  setupToken: string
): Promise<{ success: boolean; vaultId?: string; error?: string }> {
  try {
    const session = await auth();
    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_API_BASE}/v3/vault/payment-tokens`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payment_source: {
          token: {
            id: setupToken,
            type: "SETUP_TOKEN",
          },
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: `Failed to create payment token: ${err}` };
    }

    const data = (await response.json()) as { id: string };
    const vaultId = data.id;

    // Save vault_id to DB for the authenticated user (or fallback primary user)
    if (session?.user?.id) {
      await db
        .update(users)
        .set({ vaultId, updatedAt: new Date() })
        .where(eq(users.id, session.user.id));
    } else {
      // If running local sandbox without login, link to first user
      const [firstUser] = await db.select({ id: users.id }).from(users).limit(1);
      if (firstUser) {
        await db
          .update(users)
          .set({ vaultId, updatedAt: new Date() })
          .where(eq(users.id, firstUser.id));
      }
    }

    return { success: true, vaultId };
  } catch (error: any) {
    console.error("[saveVaultPaymentToken]", error);
    return { success: false, error: error.message ?? "Internal error" };
  }
}

/**
 * 4. Get Current User's Vault Status
 */
export async function getVaultStatus(): Promise<{
  connected: boolean;
  vaultId?: string;
}> {
  try {
    const session = await auth();
    let userRow: { vaultId: string | null } | undefined;

    if (session?.user?.id) {
      const [u] = await db
        .select({ vaultId: users.vaultId })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);
      userRow = u;
    } else {
      const [u] = await db
        .select({ vaultId: users.vaultId })
        .from(users)
        .limit(1);
      userRow = u;
    }

    if (userRow?.vaultId) {
      return { connected: true, vaultId: userRow.vaultId };
    }
    return { connected: false };
  } catch (error) {
    console.error("[getVaultStatus]", error);
    return { connected: false };
  }
}
