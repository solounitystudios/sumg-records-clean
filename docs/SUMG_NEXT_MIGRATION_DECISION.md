# SUMG Next Migration Decision

**Status:** Decision record, grounded in live production verification (`SUMG_PRODUCTION_SCHEMA_DRIFT_AUDIT.md`). No migration was applied in this pass.

---

## 1. A0 (RLS hardening) — SUPERSEDED, see `SUMG_SECURITY_MIGRATION_HARDENING.md`

**This section described a since-corrected version of A0 and is kept only for historical record of what was found wrong.** `supabase/migrations_proposed/A0_rls_hardening.sql` has since been rewritten against a fresh live `pg_policies` query, with `dna_records`/`import_logs`/`apple_metrics_daily` fully hardened and `artist_spotify_snapshots`'s write policy tightened (its public read is deliberately deferred pending a traced code precondition, not a naming bug). A companion `A0_1_append_inbox_log_hardening.sql` now exists for the SECURITY DEFINER function bypass. Full current reasoning, the proven app-dependency traces, and the A0 decision as it stands now: **`SUMG_SECURITY_MIGRATION_HARDENING.md`**. The original naming-mismatch finding below remains true of the version reviewed at the time and is why the rewrite happened.

<details>
<summary>Original finding (2026-09-09, production-verification pass) — superseded, kept for record</summary>

A0 (`supabase/migrations_proposed/A0_rls_hardening.sql`, shipped in PR #21) was written from repo SQL alone, before any live query was possible. Checked every one of its four `DROP POLICY IF EXISTS` statements against the actual live policy names (`SUMG_PRODUCTION_SCHEMA_DRIFT_AUDIT.md` §4):

| A0 targets policy named | Live policy is actually named | Would A0's DROP work? |
|---|---|---|
| `dna_records_open_policy` | `admin_all_dna_records` | **No — silent no-op** |
| `admin_all_import_logs` | `admin_all_import_logs` | ✅ Matches, would work |
| `public read artist_spotify_snapshots` | `public read artist snapshots` | **No — silent no-op** |
| `public read apple_metrics_daily` | `public read apple metrics` | **No — silent no-op** |

If A0 were applied exactly as written today, three of its four fixes would silently fail: the `DROP POLICY IF EXISTS` for a non-matching name is a no-op (by design — that's what `IF EXISTS` means), so A0's new, restrictive policies would be **added alongside** the old open ones rather than replacing them. Since Postgres RLS policies are OR'd together, the old open policy would still win. `dna_records` — the single highest-severity finding in the whole security audit (fully open read+write) — would remain exactly as exposed as before, while the migration's own commit history would say it had been fixed. This is the exact failure mode "verify production reality first" exists to catch.

**Additional gaps beyond the naming mismatch:**

- `import_logs`'s live policy is `FOR ALL` (open write too, not just read as A0's own comment states) — A0's fix is still technically correct for this table once applied (dropping the one `ALL/true` policy and replacing it with `SELECT`-only for CMS roles removes both the open read and the open write), but the inline comment describing the "before" state should be corrected to match reality.
- `artist_spotify_snapshots` has a write-policy gap A0 never addresses: `cms write artist snapshots` uses `auth.role() = 'authenticated'` (any signed-in user at all, not gated to a CMS role). A0 only ever proposed touching the public SELECT policy.
- Restricting `artist_spotify_snapshots`'s public SELECT — even with the policy name fixed — has a real, verified compatibility cost: `lib/cms/index.ts::getArtistSpotifySnapshots()` is called from `/admin/spotify`, `/admin/analytics`, and `SpotifyArtistRow.tsx` using an **anonymous, session-less** Supabase client (`getSupabaseClient()` in that file builds a fresh client from `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with no session attached — it does not inherit the logged-in admin's JWT). That client currently only gets rows back because the SELECT policy is `true`. Restricting it to `is_cms_role()` would make `auth.jwt()` evaluate against an empty/anonymous session and return zero rows — **silently breaking the Spotify snapshot display on those three admin surfaces**, not with an error, just empty data. Any revised A0 that touches this policy must either (a) also change the calling code to use a session-aware or service-role client, or (b) leave public SELECT in place for this specific table and rely on the fact that follower/popularity counts are not sensitive data (they're publicly visible on Spotify itself).
- `apple_metrics_daily`'s restriction is safe as originally proposed — its only caller (`lib/db/appleMusic.ts`) already uses the service-role client, which bypasses RLS regardless of the table policy.
- A0 does not cover the `append_inbox_log()` SECURITY-DEFINER-with-no-auth-check finding (drift audit §6) — that's a function-level fix (`REVOKE EXECUTE` from `anon`/`authenticated`, or add an internal `is_cms_role()` check, or `SET search_path`), a different mechanism than `CREATE POLICY`. Recommend a companion slice (call it **A0.1**) rather than folding it into A0's scope.

**Safe to promote: NO**, not in its current form.

**Recommended revision (not written as SQL in this pass — this is the spec for the next pass to implement and re-verify against a fresh live query before promoting):**

1. Replace every `DROP POLICY IF EXISTS "<guessed-name>"` with the confirmed live name (table above), or better, use a `DO $$ ... $$` block that drops *whatever* policy currently exists on that table+command rather than a hardcoded name, so a future drift doesn't repeat this exact failure mode silently.
2. Add a fifth fix: `artist_spotify_snapshots`'s write policy — either tighten it to `is_cms_role()` (matching every other table's pattern) or, at minimum, document explicitly why it's `authenticated`-only if that's intentional (it doesn't appear to be — no other table in the entire schema uses this pattern).
3. Decide, explicitly, whether `artist_spotify_snapshots`'s public SELECT stays or goes — and if it goes, file the `lib/cms/index.ts` client-fix as a co-requisite, not an afterthought.
4. Create a companion `A0.1_append_inbox_log_hardening.sql` for the function-level fix, kept separate since its remediation shape (function REVOKE/rewrite) differs from A0's (CREATE POLICY).
5. Before promoting anything, re-run the exact live `pg_policies` query this pass used — policy names and behavior are a moving target and must be re-verified at promotion time, not assumed from this document.

</details>

## 2. Overall migration sequencing recommendation — updated

See `supabase/migrations_proposed/README.md` for the proven-from-SQL dependency graph (none of the seven proposal files has a hard FK dependency on another) and `SUMG_SECURITY_MIGRATION_HARDENING.md` §13 for the reasoning. Current recommended order:

```
A0 (rewritten)    — ready to promote as written; the artist_spotify_snapshots write-policy
                     fix and the dna_records/import_logs/apple_metrics_daily closures have
                     zero traced dependency. Its SELECT policy on artist_spotify_snapshots
                     is deliberately left untouched — see SUMG_SECURITY_MIGRATION_HARDENING.md §5
A0.1 (new)        — ready to promote; zero app-code change required, the one legitimate
                     caller already uses service-role and is unaffected
A1 (revised again) — ready for human review; created_by/uploaded_by now UUID->auth.users,
                     upload_status added per the vault preflight's SHA-256 design
A2 (revised)      — ready for human review; set_by now UUID->auth.users, AI-cannot-clear
                     backstop now keys off set_by_source (provenance vocabulary) not a
                     fragile string match, UNIQUE(subject_type, subject_id) added
A5 (revised)      — ready for human review; actor now UUID->auth.users (nullable)
A3, A4            — still deferred, unchanged this pass — no code depends on them yet
```

None of A0/A0.1/A1/A2/A3/A4/A5 were applied in this pass.

## 3. Lint CI baseline policy (Part 17)

PR #21's "Typecheck & Build" CI check is currently **red**, confirmed via `gh pr checks 21` + the actual failing job log (`gh run view ... --log-failed`): `69 problems (0 errors, 69 warnings)` against `npm run lint -- --max-warnings 50`. Verified this is a pre-existing repository baseline, not something the foundation branch introduced, three independent ways: (1) the CI log itself is the branch's own clean-checkout run; (2) a fresh `git worktree` of `main` @ `2affc03` run through the identical command produces the identical `69 problems (0 errors, 69 warnings)`; (3) a line-by-line diff between the two warning lists is empty except for one warning sourced from `worker/dist/index.js`, a gitignored local build artifact that doesn't exist in either a clean `main` checkout or CI's checkout at all. **Zero warnings were introduced by the foundation branch.**

Per this pass's instruction not to fix 70 unrelated warnings inside a catalog-implementation PR, and preferring "new warnings are not allowed, existing debt is tracked separately":

**Recommended policy: Option A, adjusted — set the ceiling to the exact current baseline (69) with a comment explaining why, and open a separate tracked issue for the debt itself; do not silently raise the ceiling and do not silently disable the check.**

Concretely, for a future pass (not this one — CI config changes are a repo-policy decision, not a catalog-domain change, and are being surfaced as a recommendation, not applied):

```yaml
# ci.yml
- name: Lint
  run: npm run lint -- --max-warnings 69   # matches the current repo-wide baseline exactly —
                                             # see [tracking issue] for paying this down;
                                             # any PR that raises the count above 69 fails CI
```

Why not the other options: (B) removing the ceiling entirely stops CI from ever catching a *new* regression, which defeats the purpose of having the check at all — not recommended. (C) fixing all 70 warnings in a dedicated cleanup PR is the actual long-term right answer, but is explicitly out of scope for a catalog-foundation pass and shouldn't block merging real, tested, zero-regression work behind an unrelated pre-existing debt. The `--max-warnings 69` adjustment is the smallest honest change that (a) unblocks PR #21 truthfully, (b) does not hide or lower the bar, and (c) still fails CI the moment anyone adds warning #70. **Not applied to `.github/workflows/ci.yml` in this pass** — flagged as a recommendation per Part 17's "propose," not "apply," instruction; the repo owner should decide whether `--max-warnings 69` or a real cleanup PR is preferred before either is merged.

**Re-confirmed in the security-migration-hardening pass:** `main` clean-checkout baseline is still exactly 69 (0 errors); this branch's delta is still 0. This recommendation still stands unchanged — do not pretend 69 warnings are acceptable forever, but do not mix this cleanup into a security-migration PR either. Not applied here.
