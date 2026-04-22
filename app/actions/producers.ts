"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"

export async function createProducer(formData: FormData) {
  await requireAdmin()

  const name = formData.get("name")?.toString().trim() ?? ""
  const slug = formData.get("slug")?.toString().trim() ?? ""
  const bio = formData.get("bio")?.toString().trim() ?? ""
  const specialtiesRaw = formData.get("specialties")?.toString().trim() ?? ""
  const specialties = specialtiesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const creditCount = parseInt(formData.get("creditCount")?.toString() ?? "0", 10)

  if (!name || !slug) throw new Error("Name and slug are required.")

  const { error } = await supabase.from("producers").insert({
    id: crypto.randomUUID(),
    slug,
    name,
    bio: bio || null,
    specialties_list: specialties,
    credit_count: isNaN(creditCount) ? 0 : creditCount,
    sort_order: 999,
  })

  if (error) throw new Error(error.message)

  revalidatePath("/admin/producers")
  revalidatePath("/producers")
  redirect("/admin/producers")
}

export async function updateProducer(id: string, formData: FormData) {
  await requireAdmin()

  const name = formData.get("name")?.toString().trim() ?? ""
  const bio = formData.get("bio")?.toString().trim() ?? ""
  const specialtiesRaw = formData.get("specialties")?.toString().trim() ?? ""
  const specialties = specialtiesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const creditCount = parseInt(formData.get("creditCount")?.toString() ?? "0", 10)

  const { error } = await supabase
    .from("producers")
    .update({
      name,
      bio: bio || null,
      specialties_list: specialties,
      credit_count: isNaN(creditCount) ? 0 : creditCount,
    })
    .eq("id", id)

  if (error) throw new Error(error.message)

  revalidatePath("/admin/producers")
  revalidatePath("/producers")
  redirect("/admin/producers")
}
