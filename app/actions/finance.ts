"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/db/finance"

export async function createTransaction(formData: FormData) {
  await requireAdmin()

  const type = formData.get("type")?.toString() as "income" | "expense"
  const category = formData.get("category")?.toString().trim() ?? ""
  const amount = parseFloat(formData.get("amount")?.toString() ?? "0")
  const currency = formData.get("currency")?.toString() ?? "USD"
  const transaction_date = formData.get("transaction_date")?.toString() ?? ""
  const description = formData.get("description")?.toString().trim() ?? ""
  const artist_slug = formData.get("artist_slug")?.toString().trim() || null
  const release_slug = formData.get("release_slug")?.toString().trim() || null
  const notes = formData.get("notes")?.toString().trim() ?? ""

  if (!type || !category || !transaction_date || isNaN(amount) || amount <= 0) {
    throw new Error("Type, category, amount, and date are required.")
  }

  const validCategories = type === "income"
    ? (INCOME_CATEGORIES as readonly string[])
    : (EXPENSE_CATEGORIES as readonly string[])
  if (!validCategories.includes(category)) {
    throw new Error(`Invalid category for ${type}.`)
  }

  const { error } = await supabase.from("finance_transactions").insert({
    type,
    category,
    amount,
    currency,
    transaction_date,
    description,
    artist_slug,
    release_slug,
    notes,
  })

  if (error) throw new Error(error.message)

  revalidatePath("/admin/finance")
  redirect("/admin/finance")
}

export async function deleteTransaction(id: string) {
  await requireAdmin()

  const { error } = await supabase.from("finance_transactions").delete().eq("id", id)
  if (error) throw new Error(error.message)

  revalidatePath("/admin/finance")
}
