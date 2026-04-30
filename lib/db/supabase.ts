import { createClient } from "@supabase/supabase-js"

// The `?? "..."` fallbacks prevent this from throwing during `next build` when
// env vars are absent in the build environment (Railway build ≠ runtime env).
// At runtime the real vars are always present; the placeholders are never used.
export const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co").replace(/\/$/, ""),
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-build-only",
)
