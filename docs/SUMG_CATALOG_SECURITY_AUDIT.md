# SUMG Catalog Security Audit

**Status:** Documentation only, from repo state on branch `feat/catalog-command-center-foundation` at the point this pass started (based off `main` @ `2affc03`). No RLS was applied, rewritten, or otherwise mutated live in this pass — see §5 for the one narrow, isolated fix *proposed* (not applied).

**Scope of claims in this document:** every finding below is derived from reading files committed to this repository (`lib/supabase/schema.sql`, `supabase/migrations/*.sql`) at the base commit — it describes what the *repo defines*, not a query result from a live production database. No production database was queried to produce this document (no credentials for one were used or available in this pass). Where a repo-level definition and the actual deployed state could plausibly diverge, that is called out explicitly rather than stated as fact; nothing here should be read as production-verified unless a live query is cited.

Target rule per the mission brief: **internal catalog data = default deny. Public exposure must be explicit.**

---

## 1. Auth model

Single source of truth: `lib/auth.ts`. Role comes from the Supabase Auth JWT claim `app_metadata.role`, not a separate `users` table.

- `EXECUTIVE_ROLES` = `owner`, `co_owner`, `admin` — gated by `requireAdmin()`.
- `CMS_ROLES` = `admin`, `editor`, `media_manager`, `release_manager` — checked via `isCmsRole()`.
- Artist-portal accounts carry `app_metadata.artist_slug`.
- `requireAuth()` / `requireAdmin()` run server-side only (Server Components / Server Actions), calling `redirect()` from `next/navigation`. No client-side-only auth gate was found across the audited surface.
- Capability-level granularity (`catalog.read`, `assets.upload`, `rights.clear`, etc. — Part 4 of the mission brief) **does not exist yet**. Only the ~6 coarse roles above exist. See §"Capability mapping" in `SUMG_CATALOG_IMPLEMENTATION_PLAN.md` for the proposed future vocabulary — not implemented this pass, by design (Part 4 says don't replace current RBAC unless necessary).

## 2. RLS pattern

A consistent `is_cms_role()` SQL helper (`lib/supabase/schema.sql:169`) checks `auth.jwt()->'app_metadata'->>'role'` against the CMS role array; a stricter `is_admin_role()` (`lib/supabase/schema.sql:452`) gates owner-only writes (e.g. Shopify order management). Both are `GRANT EXECUTE ... TO authenticated, anon` — safe, since they only gate policy predicates, not data. Most tables use `USING (is_cms_role())` and this is the correct default-deny pattern.

**Open (`USING(true)`) policies found — four tables, not the two previously documented in `docs/phase-0/MEDIA_SYSTEM_AUDIT.md`:**

| Table | Migration | Read | Write |
|---|---|---|---|
| `dna_records` | `20260425000000_dna_records.sql:51-53` | open | open |
| `import_logs` | `20260424000000_import_logs.sql:25-29` | open | — |
| `spotify_intelligence_layer` (table(s) added in this migration) | `20260423000000_spotify_intelligence_layer.sql` | open | — |
| Apple Music integration table(s) | `20260426000000_apple_music_integration.sql` | open | — |

`dna_records` is the most exposed: full read *and* write with no auth check at all. It holds producer/artist creative-identity profiles (archetype, brand positioning, Suno metatag rules) — not classic "secret" data, but it is internal editorial IP and, per this pass's default-deny rule, should not be world-writable.

**`assets` table RLS is now defined at the repo level** — this narrows the "unverified" open question carried over from `docs/phase-0/MEDIA_SYSTEM_AUDIT.md`, but is still a repo-schema claim, not a production query result (see the scope note above): `lib/supabase/schema.sql:200` defines `create policy "public read assets" on assets for select using (true)`, and writes are gated by `create policy "cms write assets" on assets for all using (is_cms_role())` (`schema.sql:208`). If the deployed database matches this file — which a `pg_policies` query against the live project would need to confirm, and which this pass did not run — then `assets` is RLS-enabled, publicly *readable* by design (public pages render asset URLs directly), and CMS-role-gated for writes, which would not be an oversight. Either way, it means **the `assets` table is unsuitable for private masters as-is**: anything inserted there is enumerable via the anon key under the repo-defined policy. This is the concrete argument for Part 11's Private Master Vault living outside `assets`/`sumg-assets` rather than being bolted onto the existing public-read table. See `SUMG_CATALOG_PERSISTENCE_AUDIT.md` §"Master Vault mapping".

## 3. Service-role usage

- `lib/supabase/server.ts::createServiceClient()` is the one intentionally privileged path. It throws loudly if `SUPABASE_SERVICE_ROLE_KEY` is unset and is documented server-only.
- `lib/db/supabase.ts` instantiates a second service-role client at module scope, used by most `lib/db/*` repositories, with a placeholder fallback so `next build` doesn't fail when the env var is absent at build time.
- No import of either service-role client was found from a `"use client"` file in the audited surface. Next.js would fail the build if a server-only secret leaked into a client bundle via `server-only` package guards already in `package.json` dependencies.
- **Consolidation note:** two separate service-role client constructors (`lib/supabase/server.ts` and `lib/db/supabase.ts`) is duplication worth converging on in a future pass — not fixed here since it's a broad refactor, not an isolated safe fix.

## 4. Secrets

Provider credentials are environment variables, correctly un-prefixed (no `NEXT_PUBLIC_` on anything secret): `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET`, `YOUTUBE_CLIENT_ID`/`YOUTUBE_CLIENT_SECRET`, `APPLE_MUSIC_KEY_ID`/`APPLE_MUSIC_PRIVATE_KEY`/`APPLE_MUSIC_TEAM_ID`, `SHOPIFY_ADMIN_ACCESS_TOKEN`. `NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN` is intentionally public — Shopify Storefront tokens are designed for client exposure — not a defect.

**Real gap: YouTube OAuth tokens are stored in plaintext.** `yt_channels.oauth_access_token` / `oauth_refresh_token` (`supabase/migrations/20260430000000_yt_oauth_and_engine_logs.sql`) are raw `TEXT` columns, not encrypted and not referenced indirectly. RLS on `yt_channels` is admin-role-gated (not open), so this is not publicly exposed today, but it is exactly the pattern Part 17 of the mission brief (`provider_connections` with `credential_ref`, never a raw secret column) is designed to replace. This is the one existing table that already resembles a "provider connection," and it stores the secret directly. Documented as a target for the future `provider_connections` design in `lib/catalog/` — not migrated this pass (Part 33 disallows production mutation and new source-account connections).

## 5. Narrow fix applied this pass

Per Part 3 ("if an isolated security issue is clearly safe to fix, fix it narrowly and test it") and Part 33 ("isolated safe security fixes" are allowed): none of the four open-RLS tables above were touched with a live migration in this pass, because **fixing RLS requires a migration applied to a real database**, and Part 33 explicitly disallows production DB migrations in this pass. Instead, a narrow *proposed* migration is included as a slice — see `SUMG_CATALOG_PERSISTENCE_AUDIT.md` §"Migration slices", slice **A0 — RLS hardening** — ready to apply in a follow-up pass with explicit approval. This keeps the fix real and reviewable without performing an unauthorized production mutation.

## 6. DSP integration security posture

| Provider | Direction | Auth mechanism | Notes |
|---|---|---|---|
| Spotify | read-only enrichment | Client Credentials (app-level, no per-user OAuth) | No push capability; lowest risk |
| Apple Music | read-only enrichment | Developer JWT signed from `APPLE_MUSIC_PRIVATE_KEY` | No push capability |
| Shopify | bidirectional-lite | Storefront (public token, read) + Admin token (order mgmt, admin-role-gated) | Commerce-scoped, not catalog-scoped |
| YouTube | push (uploads) | Full OAuth2, refresh token stored per-channel | Only true write-capable external integration; see plaintext-token gap above |

## 7. Public vs. private exposure

The public website (`app/(public routes)`) reads only CMS-projected fields via `lib/cms/mappers.ts` — `CMSSong`/`CMSRelease`/`CMSArtist`/etc. — which do not include `rights_metadata`, `distribution_record`, `provider_config`, internal notes, or any admin-only column. This projection boundary is the correct pattern per Part 25 of the mission brief (never expose private masters, stems, AI inference, internal notes, rights evidence, contracts, credentials, or unpublished assets) and should be preserved, not rebuilt, as the canonical Work/Recording model lands.

## 8. Summary

| Area | Status |
|---|---|
| RLS default-deny pattern | Present and consistent (`is_cms_role()`) except 4 tables |
| Open RLS tables | 4 — `dna_records`, `import_logs`, spotify intelligence table(s), Apple Music integration table(s) |
| `assets` RLS | Defined in repo schema: enabled, public-read by design, CMS-role-gated writes. Not production-verified (no live query run). Not suitable for private masters as-is either way. |
| Service role exposure | None found; two duplicate constructors worth converging later |
| Secrets in env | Correctly scoped, no client leakage found |
| Secrets in DB | One gap — YouTube OAuth tokens stored in plaintext on `yt_channels` |
| Public/private projection boundary | Present and correct via `lib/cms/mappers.ts` |
| Fixes applied in this pass | None applied live (would require production migration); one migration slice proposed (A0) for follow-up |
