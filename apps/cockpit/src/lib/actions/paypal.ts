"use server";

import { db } from "@leash/db";
import { users } from "@leash/db";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

const PAYPAL_API_BASE =
  process.env["PAYPAL_API_BASE"] ??
  process.env["PAYPAL_BASE_URL"] ??
  "https://api-m.sandbox.paypal.com";

// ─── Internal helper ─────────────────────────────────────────────────────────

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env["PAYPAL_CLIENT_ID"];
  const clientSecret = process.env["PAYPAL_CLIENT_SECRET"];
  if (!clientId || !clientSecret)
    throw new Error("Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET");

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`PayPal OAuth failed: ${await res.text()}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

// ─── Helper to get/set user in DB ────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  try {
    const session = await auth();
    if (session?.user?.id) return session.user.id;
    const [first] = await db.select({ id: users.id }).from(users).limit(1);
    if (first?.id) return first.id;
    const [created] = await db
      .insert(users)
      .values({
        email: "operator@agentleash.dev",
        name: "Operator",
      })
      .returning({ id: users.id });
    return created?.id ?? null;
  } catch (error) {
    console.error("[getUserId] error:", error);
    return null;
  }
}

// ─── Step 1: Create a PayPal client token for the frontend SDK ───────────────

/**
 * Creates a PayPal client token.
 * Used by the PayPal JS SDK on the frontend to initialize the Buttons component.
 * No LIPP / "Log In with PayPal" dashboard setting required.
 */
export async function createPayPalClientToken(): Promise<{
  success: boolean;
  clientToken?: string;
  clientId?: string;
  error?: string;
}> {
  try {
    const clientId = process.env["PAYPAL_CLIENT_ID"];
    if (!clientId) return { success: false, error: "Missing PAYPAL_CLIENT_ID" };

    const accessToken = await getPayPalAccessToken();

    const res = await fetch(`${PAYPAL_API_BASE}/v1/identity/generate-token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Accept-Language": "en_US",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[createPayPalClientToken] failed:", err);
      return { success: false, error: `Failed to generate client token: ${err}` };
    }

    const data = (await res.json()) as { client_token: string };
    return { success: true, clientToken: data.client_token, clientId };
  } catch (error: any) {
    console.error("[createPayPalClientToken]", error);
    return { success: false, error: error.message };
  }
}

// ─── Step 2: Create a Vault Setup Token ──────────────────────────────────────

/**
 * Creates a PayPal Vault Setup Token.
 * Called when user clicks "Connect PayPal Wallet" button.
 * The setup token is passed to the PayPal Buttons SDK on the frontend.
 *
 * Vault v3 API: POST /v3/vault/setup-tokens
 * No "Log in with PayPal" dashboard feature required.
 */
export async function createVaultOrder(): Promise<{
  success: boolean;
  orderId?: string;
  error?: string;
}> {
  try {
    const accessToken = await getPayPalAccessToken();
    const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `order-vault-${Date.now()}`,
      },
      body: JSON.stringify({
        intent: "AUTHORIZE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: "1.00",
            },
            description: "Agent Leash Autonomous Payment Authorization",
          },
        ],
        payment_source: {
          paypal: {
            attributes: {
              vault: {
                store_in_vault: "ON_SUCCESS",
                usage_type: "MERCHANT",
              },
            },
            experience_context: {
              brand_name: "Agent Leash",
              landing_page: "LOGIN",
              shipping_preference: "NO_SHIPPING",
              user_action: "CONTINUE",
              return_url: `${process.env["NEXTAUTH_URL"] ?? process.env["COCKPIT_URL"] ?? "http://localhost:3001"}/settings`,
              cancel_url: `${process.env["NEXTAUTH_URL"] ?? process.env["COCKPIT_URL"] ?? "http://localhost:3001"}/settings?vault=cancelled`,
            },
          },
        },
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[createVaultOrder] failed:", err);
      return { success: false, error: `Order creation failed: ${err}` };
    }

    const data = (await res.json()) as { id: string };
    return { success: true, orderId: data.id };
  } catch (error: any) {
    console.error("[createVaultOrder]", error);
    return { success: false, error: error.message };
  }
}

export async function confirmVaultOrder(orderId: string): Promise<{
  success: boolean;
  vaultId?: string;
  payerId?: string;
  email?: string;
  error?: string;
}> {
  try {
    const accessToken = await getPayPalAccessToken();

    // 1. Authorize the order (this vaults the payment source per store_in_vault: ON_SUCCESS)
    const authRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/authorize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!authRes.ok) {
      const err = await authRes.text();
      console.error("[confirmVaultOrder] authorization failed:", err);
      return { success: false, error: `Authorization failed: ${err}` };
    }

    const authData = (await authRes.json()) as any;

    // 2. Fetch full order details to extract vault ID and account info
    const orderRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const orderData = (await orderRes.json()) as any;
    const paypalSource = orderData.payment_source?.paypal ?? authData.payment_source?.paypal;
    const vaultTokenId =
      paypalSource?.attributes?.vault?.id ??
      paypalSource?.account_id ??
      `vault_${orderId}`;
    const email = paypalSource?.email_address;
    const payerId = paypalSource?.account_id;

    // 3. Immediately void the authorization so 0 dollars are held
    const authId = authData.purchase_units?.[0]?.payments?.authorizations?.[0]?.id;
    if (authId) {
      try {
        await fetch(`${PAYPAL_API_BASE}/v2/payments/authorizations/${authId}/void`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });
      } catch (voidErr) {
        console.warn("[confirmVaultOrder] void auth warning:", voidErr);
      }
    }

    // 4. Store the permanent vault ID in the DB
    const userId = await getUserId();
    if (userId) {
      await db
        .update(users)
        .set({ vaultId: vaultTokenId, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }

    console.log("[confirmVaultOrder] Vault token successfully saved:", vaultTokenId);
    return { success: true, vaultId: vaultTokenId, payerId, email };
  } catch (error: any) {
    console.error("[confirmVaultOrder]", error);
    return { success: false, error: error.message };
  }
}

export async function createVaultSetupToken(): Promise<{
  success: boolean;
  setupTokenId?: string;
  approvalUrl?: string;
  error?: string;
}> {
  try {
    const accessToken = await getPayPalAccessToken();

    const res = await fetch(`${PAYPAL_API_BASE}/v3/vault/setup-tokens`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `setup-${Date.now()}`,
      },
      body: JSON.stringify({
        payment_source: {
          paypal: {
            usage_type: "MERCHANT",
            experience_context: {
              payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
              payment_method_selected: "PAYPAL",
              brand_name: "Agent Leash",
              locale: "en-US",
              landing_page: "LOGIN",
              shipping_preference: "NO_SHIPPING",
              user_action: "SUBSCRIBE_NOW",
              return_url: `${process.env["NEXTAUTH_URL"] ?? process.env["COCKPIT_URL"] ?? "http://localhost:3001"}/api/paypal/vault-return`,
              cancel_url: `${process.env["NEXTAUTH_URL"] ?? process.env["COCKPIT_URL"] ?? "http://localhost:3001"}/settings?vault=cancelled`,
            },
          },
        },
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[createVaultSetupToken] failed:", err);
      return { success: false, error: `Setup token creation failed: ${err}` };
    }

    const data = (await res.json()) as {
      id: string;
      links: { href: string; rel: string }[];
    };

    const approvalLink = data.links?.find((l) => l.rel === "approve");
    return {
      success: true,
      setupTokenId: data.id,
      approvalUrl: approvalLink?.href,
    };
  } catch (error: any) {
    console.error("[createVaultSetupToken]", error);
    return { success: false, error: error.message };
  }
}

// ─── Step 3: Confirm Vault Token after user approval ─────────────────────────

/**
 * After the user approves in the PayPal popup, exchange the setup token
 * for a permanent payment token and store it in DB.
 *
 * Called from the API route /api/paypal/vault-return
 * or directly from client after onApprove fires.
 */
export async function confirmVaultToken(setupTokenId: string): Promise<{
  success: boolean;
  paymentTokenId?: string;
  payerId?: string;
  email?: string;
  error?: string;
}> {
  try {
    const accessToken = await getPayPalAccessToken();

    // Exchange setup token for a permanent vault payment token
    const res = await fetch(`${PAYPAL_API_BASE}/v3/vault/payment-tokens`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `vault-${setupTokenId}`,
      },
      body: JSON.stringify({
        payment_source: {
          token: {
            id: setupTokenId,
            type: "SETUP_TOKEN",
          },
        },
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[confirmVaultToken] failed:", err);
      return { success: false, error: `Vault confirmation failed: ${err}` };
    }

    const data = (await res.json()) as {
      id: string;
      customer?: { id: string };
      payment_source?: {
        paypal?: {
          account_id?: string;
          email_address?: string;
        };
      };
    };

    const paymentTokenId = data.id;
    const payerId = data.customer?.id ?? data.payment_source?.paypal?.account_id;
    const email = data.payment_source?.paypal?.email_address;

    // Store in DB
    const userId = await getUserId();
    if (userId) {
      await db
        .update(users)
        .set({ vaultId: paymentTokenId, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }

    console.log("[confirmVaultToken] Vault token saved:", paymentTokenId);
    return { success: true, paymentTokenId, payerId, email };
  } catch (error: any) {
    console.error("[confirmVaultToken]", error);
    return { success: false, error: error.message };
  }
}

// ─── Disconnect wallet ────────────────────────────────────────────────────────

export async function disconnectWallet(): Promise<{ success: boolean }> {
  try {
    const userId = await getUserId();
    if (userId) {
      await db
        .update(users)
        .set({ vaultId: null, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }
    return { success: true };
  } catch (error) {
    console.error("[disconnectWallet]", error);
    return { success: false };
  }
}

// ─── Get current vault status ─────────────────────────────────────────────────

export async function getVaultStatus(): Promise<{
  connected: boolean;
  vaultId?: string;
}> {
  try {
    const userId = await getUserId();
    if (!userId) return { connected: false };
    const [u] = await db
      .select({ vaultId: users.vaultId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return u?.vaultId ? { connected: true, vaultId: u.vaultId } : { connected: false };
  } catch (error) {
    console.error("[getVaultStatus]", error);
    return { connected: false };
  }
}

// ─── Legacy exports (kept for any references that might exist) ────────────────
// Stub out old OIDC functions so nothing breaks during migration
export async function getPayPalAuthUrl() {
  return { success: false, error: "Switched to Checkout/Vault flow. Use createVaultSetupToken() instead." };
}
export async function exchangePayPalCode(_code: string) {
  return { success: false, error: "Switched to Checkout/Vault flow. Use confirmVaultToken() instead." };
}
