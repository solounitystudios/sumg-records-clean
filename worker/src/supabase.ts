import { createClient } from "@supabase/supabase-js"

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error("[worker] FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
  process.exit(1)
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
})

export const BUCKET = process.env.STORAGE_BUCKET ?? "sumg-assets"
