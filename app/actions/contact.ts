"use server";

import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url?.startsWith("https://") || !key) return null;
  return createClient(url, key);
}

export async function submitContact(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const name = formData.get("name")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim() ?? "";
  const subject = formData.get("subject")?.toString().trim() ?? "";
  const message = formData.get("message")?.toString().trim() ?? "";

  if (!name || !email || !message) {
    return {
      success: false,
      error: "Name, email, and message are required.",
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const sb = getSupabaseClient();
  if (!sb) {
    // Supabase not configured — silently succeed in dev
    return { success: true };
  }

  const { error } = await sb
    .from("contact_submissions")
    .insert({ name, email, subject, message });

  if (error) {
    console.error("[contact]", error.message);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }

  return { success: true };
}
