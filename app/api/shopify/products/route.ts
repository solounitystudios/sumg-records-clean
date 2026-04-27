import { NextResponse } from "next/server"
import { getPublicProducts } from "@/lib/shopify/server"

export const revalidate = 300

export async function GET() {
  const products = await getPublicProducts()
  return NextResponse.json(products)
}
