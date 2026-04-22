"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"

export async function createBrand(formData: FormData) {
  await requireAdmin()

  const name = formData.get("name")?.toString().trim() ?? ""
  const slug = formData.get("slug")?.toString().trim() ?? ""
  const tagline = formData.get("tagline")?.toString().trim() ?? ""
  const descriptor = formData.get("descriptor")?.toString().trim() ?? ""
  const category = formData.get("category")?.toString().trim() ?? "Fashion"

  if (!name || !slug) throw new Error("Name and slug are required.")

  const { error } = await supabase.from("brands").insert({
    id: crypto.randomUUID(),
    slug,
    name,
    tagline: tagline || "",
    descriptor: descriptor || "",
    category: category || "Fashion",
    sort_order: 999,
  })

  if (error) throw new Error(error.message)

  revalidatePath("/admin/brands")
  revalidatePath("/brands")
  redirect("/admin/brands")
}

export async function updateBrand(slug: string, formData: FormData) {
  await requireAdmin()

  const name = formData.get("name")?.toString().trim() ?? ""
  const tagline = formData.get("tagline")?.toString().trim() ?? ""
  const descriptor = formData.get("descriptor")?.toString().trim() ?? ""
  const category = formData.get("category")?.toString().trim() ?? "Fashion"

  if (!name) throw new Error("Name is required.")

  const { error } = await supabase
    .from("brands")
    .update({ name, tagline, descriptor, category })
    .eq("slug", slug)

  if (error) throw new Error(error.message)

  revalidatePath("/admin/brands")
  revalidatePath(`/brands/${slug}`)
  revalidatePath("/brands")
  redirect("/admin/brands")
}
