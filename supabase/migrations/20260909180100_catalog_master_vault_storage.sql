-- SUMG-CAT-P0-003 (part 2 of 2) — Private Master Vault storage bucket.
--
-- Creates the `sumg-master-vault` Supabase Storage bucket and its
-- storage.objects RLS policies. Applied ALONGSIDE
-- 20260909180000_catalog_a1_work_recording_version_lineage.sql.
--
-- Design source: docs/SUMG_MASTER_VAULT_SECURITY_CONTRACT.md §1, with one
-- deliberate refinement recorded in docs/SUMG_CAT_P0_003_MASTERVAULT_A1.md:
-- the object key drops the redundant {work_id} segment
--   proposal:  masters/{work_id}/{recording_id}/{asset_version_id}/original.{ext}
--   applied:   masters/{recording_id}/{asset_version_id}/original.{ext}
-- recording_id -> work_id is 1:1 and immutable, so nothing is lost, and the
-- shorter shape is what catalog_asset_versions_vault_ref_shape can bind
-- exactly to a row.
--
-- NON-NEGOTIABLE properties (all enforced below):
--   * private bucket (public = false) — no CDN path, no anonymous read
--   * no public object listing (a private bucket cannot be listed anonymously)
--   * admin/founder-only write   — INSERT policy gates on is_cms_role()
--   * controlled read            — SELECT policy gates on is_cms_role();
--                                  production reads use short-TTL signed URLs
--                                  minted server-side by the service-role
--                                  client (which bypasses RLS)
--   * no overwrite-by-default    — NO UPDATE policy exists for this bucket
--   * no deletion path           — NO DELETE policy exists for this bucket
--   * MIME allowlist             — master audio containers only
--   * size limit                 — 250 MB (docs/SUMG_MASTER_VAULT_SECURITY_CONTRACT.md)
--   * no service-role key client-side — the app never ships it to a browser;
--                                  see lib/db/supabase.ts (server-only module)
--
-- This migration does NOT create a public bucket, does NOT touch the existing
-- `music` or `sumg-assets` buckets, and does NOT add any policy to any other
-- bucket. `sumg-assets` is public and semantically wrong for masters; it is
-- not reused.

-- ── Bucket ──────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sumg-master-vault',
  'sumg-master-vault',
  false,
  262144000,  -- 250 * 1024 * 1024
  ARRAY[
    'audio/wav', 'audio/x-wav', 'audio/wave',
    'audio/flac', 'audio/x-flac',
    'audio/aiff', 'audio/x-aiff',
    'audio/mpeg'  -- accepted but UI-flagged non-master-quality
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public             = false,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── storage.objects RLS ─────────────────────────────────────────────────────
-- RLS is already enabled on storage.objects by Supabase. These policies are
-- ADDITIVE and scoped by bucket_id — they do not widen access to any other
-- bucket. Idempotent via DROP ... IF EXISTS (CREATE POLICY has no IF NOT
-- EXISTS form).
DROP POLICY IF EXISTS "master vault cms read"   ON storage.objects;
DROP POLICY IF EXISTS "master vault cms write"  ON storage.objects;

CREATE POLICY "master vault cms read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sumg-master-vault' AND public.is_cms_role());

CREATE POLICY "master vault cms write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'sumg-master-vault' AND public.is_cms_role());

-- Intentionally NO "FOR UPDATE" and NO "FOR DELETE" policy for
-- bucket_id = 'sumg-master-vault'. With RLS enabled and no matching policy,
-- there is no client path (any role short of service_role) to overwrite or
-- delete a stored master. This is the storage-layer equivalent of A5's
-- append-only audit log.

-- ── Reversal (manual down-path) ─────────────────────────────────────────────
--   DROP POLICY IF EXISTS "master vault cms read"  ON storage.objects;
--   DROP POLICY IF EXISTS "master vault cms write" ON storage.objects;
--   -- Only if the bucket is empty:
--   DELETE FROM storage.buckets WHERE id = 'sumg-master-vault';
-- Never delete the bucket while it holds objects — that would orphan real
-- masters. Reconciliation (docs/SUMG_MASTER_VAULT_SECURITY_CONTRACT.md §2)
-- must show zero objects first.
