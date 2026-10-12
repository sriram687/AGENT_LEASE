"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export async function revokeMandate(
  mandateId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const response = await fetch(
      `${process.env["LEASH_GATEWAY_URL"]}/api/mandates/${mandateId}/revoke`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Leash-Internal": process.env["LEASH_INTERNAL_SECRET"] ?? "",
        },
        body: JSON.stringify({ revokedById: session.user.id }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      return { success: false, error: err.error ?? "Gateway error" };
    }

    revalidatePath("/mandates");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("revokeMandate error:", err);
    return { success: false, error: "Network error communicating with gateway" };
  }
}
