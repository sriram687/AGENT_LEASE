"use server";

import { revalidatePath } from "next/cache";
import { db } from "@leash/db";
import { escalations } from "@leash/db";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function approveEscalation(
  escalationId: string,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Call gateway to trigger the authorization
    const response = await fetch(
      `${process.env["LEASH_GATEWAY_URL"]}/api/escalations/${escalationId}/approve`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Leash-Internal": process.env["LEASH_INTERNAL_SECRET"] ?? "",
        },
        body: JSON.stringify({
          reviewedById: session.user.id,
          comment: comment?.trim() || undefined,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      return { success: false, error: err.error ?? "Gateway error" };
    }

    revalidatePath("/escalations");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("approveEscalation error:", err);
    return { success: false, error: "Network error communicating with gateway" };
  }
}

export async function rejectEscalation(
  escalationId: string,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const response = await fetch(
      `${process.env["LEASH_GATEWAY_URL"]}/api/escalations/${escalationId}/reject`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Leash-Internal": process.env["LEASH_INTERNAL_SECRET"] ?? "",
        },
        body: JSON.stringify({
          reviewedById: session.user.id,
          comment: comment?.trim() || undefined,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      return { success: false, error: err.error ?? "Gateway error" };
    }

    revalidatePath("/escalations");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("rejectEscalation error:", err);
    return { success: false, error: "Network error communicating with gateway" };
  }
}
