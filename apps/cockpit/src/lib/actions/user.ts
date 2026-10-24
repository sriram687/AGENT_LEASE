"use server";

import { db, users } from "@leash/db";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { generateKeyPair } from "@leash/crypto";

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "viewer";
  publicKey: string | null;
  vaultId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch current operator user profile from DB.
 */
export async function getUserProfile(): Promise<{
  success: boolean;
  user?: UserProfileData;
  error?: string;
}> {
  try {
    const session = await auth();
    let userRow: any = null;

    if (session?.user?.id) {
      const [found] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);
      userRow = found;
    }

    if (!userRow) {
      const [first] = await db.select().from(users).limit(1);
      userRow = first;
    }

    if (!userRow) {
      // Seed default operator if empty
      const keypair = generateKeyPair();
      const [created] = await db
        .insert(users)
        .values({
          name: "Operator",
          email: "operator@agentleash.dev",
          role: "owner",
          publicKey: keypair.publicKey,
        })
        .returning();
      userRow = created;
    } else if (!userRow.publicKey) {
      const keypair = generateKeyPair();
      const [updated] = await db
        .update(users)
        .set({ publicKey: keypair.publicKey, updatedAt: new Date() })
        .where(eq(users.id, userRow.id))
        .returning();
      userRow = updated;
    }

    return {
      success: true,
      user: {
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
        role: userRow.role,
        publicKey: userRow.publicKey ?? null,
        vaultId: userRow.vaultId ?? null,
        createdAt: userRow.createdAt ? new Date(userRow.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: userRow.updatedAt ? new Date(userRow.updatedAt).toISOString() : new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error("[getUserProfile] error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Regenerate operator Ed25519 keypair and save public key in database.
 * Returns both publicKey and privateKey so operator can copy the signing private key.
 */
export async function generateOperatorKeyPair(): Promise<{
  success: boolean;
  publicKey?: string;
  privateKey?: string;
  error?: string;
}> {
  try {
    const { user: current } = await getUserProfile();
    if (!current?.id) {
      return { success: false, error: "Operator not found" };
    }

    const keypair = generateKeyPair();
    await db
      .update(users)
      .set({
        publicKey: keypair.publicKey,
        updatedAt: new Date(),
      })
      .where(eq(users.id, current.id));

    revalidatePath("/settings");
    revalidatePath("/");

    return {
      success: true,
      publicKey: keypair.publicKey,
      privateKey: keypair.privateKey,
    };
  } catch (error: any) {
    console.error("[generateOperatorKeyPair] error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update operator profile (Name, Email).
 */
export async function updateUserProfile(data: {
  name: string;
  email: string;
}): Promise<{
  success: boolean;
  user?: UserProfileData;
  error?: string;
}> {
  try {
    if (!data.name?.trim() || !data.email?.trim()) {
      return { success: false, error: "Name and email are required" };
    }

    const { user: current } = await getUserProfile();
    if (!current?.id) {
      return { success: false, error: "User not found" };
    }

    const [updated] = await db
      .update(users)
      .set({
        name: data.name.trim(),
        email: data.email.trim(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, current.id))
      .returning();

    if (!updated) {
      return { success: false, error: "Failed to update profile" };
    }

    revalidatePath("/");
    revalidatePath("/settings");

    return {
      success: true,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        publicKey: updated.publicKey ?? null,
        vaultId: updated.vaultId ?? null,
        createdAt: new Date(updated.createdAt).toISOString(),
        updatedAt: new Date(updated.updatedAt).toISOString(),
      },
    };
  } catch (error: any) {
    console.error("[updateUserProfile] error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieve the active Agent API key for the operator
 */
export async function getAgentApiKey(): Promise<{
  key: string;
  gatewayUrl: string;
}> {
  const key =
    process.env["LEASH_AGENT_API_KEY"] ||
    process.env["LEASH_INTERNAL_SECRET"] ||
    "leash_sk_live_demo8472910482019482";
  const gatewayUrl =
    process.env["LEASH_GATEWAY_URL"] ||
    "http://localhost:3000";

  return { key, gatewayUrl };
}
