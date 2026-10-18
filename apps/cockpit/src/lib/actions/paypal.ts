"use server";

import { db } from "@leash/db";
import { users } from "@leash/db";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { randomBytes } from "crypto";

const PAYPAL_API_BASE =
  process.env["PAYPAL_API_BASE"] ??
  process.env["PAYPAL_BASE_URL"] ??
  "https://api-m.sandbox.paypal.com";

const PAYPAL_WEB_BASE = "https://www.sandbox.paypal.com";

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env["PAYPAL_CLIENT_ID"];
  const clientSecret = process.env["PAYPAL_CLIENT_SECRET"];
  if (!clientId || !clientSecret) throw new Error("Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET");
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal OAuth failed: ${await res.text()}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

/**
 * Generate the PayPal OAuth Connect URL.
 *
 * Uses PayPal Identity / "Log In with PayPal" flow — works for ALL regions
 * including India sandbox. No Reference Transactions or Vault v3 needed.
 *
 * Scopes requested:
 *  - openid: basic identity
 *  - email: buyer email address
 *  - https://uri.paypal.com/services/payments/futurepayments: store payment method for future use
 *
 * After user logs in and agrees, PayPal redirects to:
 *   /api/paypal/callback?code=<AUTH_CODE>&state=<STATE>
 */
export async function getPayPalAuthUrl(): Promise<{
  success: boolean;
  authUrl?: string;
  state?: string;
  error?: string;
}> {
  try {
    const clientId = process.env["PAYPAL_CLIENT_ID"];
    if (!clientId) return { success: false, error: "Missing PAYPAL_CLIENT_ID" };

    const cockpitUrl =
      process.env["NEXTAUTH_URL"] ??
      process.env["COCKPIT_URL"] ??
      "http://localhost:3001";

    const redirectUri = `${cockpitUrl}/api/paypal/callback`;
    const state = randomBytes(16).toString("hex");

    const scopes = [
      "openid",
      "email",
      "https://uri.paypal.com/services/payments/futurepayments",
    ].join(" ");

    const params = new URLSearchParams({
      flowEntry: "static",
      client_id: clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      response_type: "code",
      state,
    });

    const authUrl = `${PAYPAL_WEB_BASE}/connect?${params.toString()}`;

    console.log("[getPayPalAuthUrl] Auth URL:", authUrl);
    return { success: true, authUrl, state };
  } catch (error: any) {
    console.error("[getPayPalAuthUrl]", error);
    return { success: false, error: error.message };
  }
}

/**
 * Exchange OAuth authorization code for tokens and store refresh_token.
 * Called from /api/paypal/callback route after PayPal redirects back.
 */
export async function exchangePayPalCode(code: string): Promise<{
  success: boolean;
  refreshToken?: string;
  email?: string;
  error?: string;
}> {
  try {
    const clientId = process.env["PAYPAL_CLIENT_ID"];
    const clientSecret = process.env["PAYPAL_CLIENT_SECRET"];
    if (!clientId || !clientSecret) throw new Error("Missing credentials");

    const cockpitUrl =
      process.env["NEXTAUTH_URL"] ??
      process.env["COCKPIT_URL"] ??
      "http://localhost:3001";

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const res = await fetch(`${PAYPAL_API_BASE}/v1/identity/openidconnect/tokenservice`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${cockpitUrl}/api/paypal/callback`,
      }).toString(),
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[exchangePayPalCode] token exchange failed:", err);
      return { success: false, error: `Token exchange failed: ${err}` };
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      token_type: string;
    };

    console.log("[exchangePayPalCode] Got refresh_token (first 20):", data.refresh_token?.slice(0, 20));

    // Fetch user email using the access token
    let email: string | undefined;
    try {
      const userRes = await fetch(`${PAYPAL_API_BASE}/v1/identity/openidconnect/userinfo?schema=openid`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
        cache: "no-store",
      });
      if (userRes.ok) {
        const userInfo = (await userRes.json()) as { email?: string };
        email = userInfo.email;
      }
    } catch (_) {}

    // Store refresh_token as vault_id in DB
    const session = await auth();
    if (session?.user?.id) {
      await db.update(users).set({ vaultId: data.refresh_token, updatedAt: new Date() }).where(eq(users.id, session.user.id));
    } else {
      const [first] = await db.select({ id: users.id }).from(users).limit(1);
      if (first) await db.update(users).set({ vaultId: data.refresh_token, updatedAt: new Date() }).where(eq(users.id, first.id));
    }

    return { success: true, refreshToken: data.refresh_token, email };
  } catch (error: any) {
    console.error("[exchangePayPalCode]", error);
    return { success: false, error: error.message };
  }
}

/**
 * Disconnect wallet — clears vault_id from DB
 */
export async function disconnectWallet(): Promise<{ success: boolean }> {
  try {
    const session = await auth();
    if (session?.user?.id) {
      await db.update(users).set({ vaultId: null, updatedAt: new Date() }).where(eq(users.id, session.user.id));
    } else {
      const [first] = await db.select({ id: users.id }).from(users).limit(1);
      if (first) await db.update(users).set({ vaultId: null, updatedAt: new Date() }).where(eq(users.id, first.id));
    }
    return { success: true };
  } catch (error) {
    console.error("[disconnectWallet]", error);
    return { success: false };
  }
}

/**
 * Get current user vault/connect status
 */
export async function getVaultStatus(): Promise<{ connected: boolean; vaultId?: string }> {
  try {
    const session = await auth();
    let userRow: { vaultId: string | null } | undefined;
    if (session?.user?.id) {
      const [u] = await db.select({ vaultId: users.vaultId }).from(users).where(eq(users.id, session.user.id)).limit(1);
      userRow = u;
    } else {
      const [u] = await db.select({ vaultId: users.vaultId }).from(users).limit(1);
      userRow = u;
    }
    return userRow?.vaultId ? { connected: true, vaultId: userRow.vaultId } : { connected: false };
  } catch (error) {
    console.error("[getVaultStatus]", error);
    return { connected: false };
  }
}
