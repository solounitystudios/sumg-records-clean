"use server";

import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url?.startsWith("https://") || !key) return null;
  return createClient(url, key);
}

export async function subscribeEmail(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const email = formData.get("email")?.toString().trim() ?? "";
  const source = formData.get("source")?.toString() ?? "site";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const sb = getSupabaseClient();
  if (!sb) {
    // Supabase not configured — silently succeed in dev
    return { success: true };
  }

  const { error } = await sb
    .from("email_subscribers")
    .insert({ email, source });

  if (error) {
    if (error.code === "23505") {
      // Unique constraint — already subscribed, treat as success
      return { success: true };
    }
    console.error("[subscribe]", error.message);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }

  return { success: true };
}
