# SUMG Catalog — Implementation Plan (this pass)

**Branch:** `feat/catalog-command-center-foundation`, base `main` @ `2affc03`. **Status:** foundation pass — audits, domain layer, migration proposals, tests, and a narrow read-only UI addition. No production mutation.

This document ties together the other four: `SUMG_CATALOG_REUSE_AUDIT.md` (what already exists), `SUMG_CATALOG_PERSISTENCE_AUDIT.md` (schema-level detail + migration slices), `SUMG_CATALOG_SECURITY_AUDIT.md` (RLS/auth), `SUMG_CATALOG_COMMAND_CENTER_ARCHITECTURE.md` (the founder-approved target). It states what this specific pass ships, what it deliberately does not, and what a follow-up pass should pick up next.

---

## 1. What shipped this pass

**Documentation (Part 35):**
- `docs/SUMG_CATALOG_COMMAND_CENTER_ARCHITECTURE.md` — locked target architecture.
- `docs/SUMG_CATALOG_REUSE_AUDIT.md` — table-by-table / system-by-system reuse matrix (Part 1/2).
- `docs/SUMG_CATALOG_PERSISTENCE_AUDIT.md` — schema comparison + migration slice plan (Part 27/28).
- `docs/SUMG_CATALOG_SECURITY_AUDIT.md` — RLS/auth/secrets audit (Part 3/4).
- This document (Part 36's "final report" companion).

**Domain layer (Part 5/6/7/8/9/10/11/13/14/15/16/17/21/23/24 — design + pure logic only):** `lib/catalog/` — canonical entity types, provenance precedence, rights-state semantics (unknown ≠ denied ≠ cleared, AI cannot clear), hard policy flags, routing (recipes always propose, never auto-approve), destination assignment state machine, asset lineage (cycle prevention, no orphan derivatives, exact-hash duplicate detection that never fabricates similarity evidence for non-matching hashes), an intake lifecycle with explicit rework paths (not pure forward-only progression) plus a source deletion safety gate chain requiring a verified human actor with explicit source-delete authority (not just a stage check), a provider-neutral `MasterVault` interface (with a deterministic, explicit-clock in-memory test fixture — no real provider wired, no hidden `new Date()`), and a provider-neutral `CatalogSourceAdapter` interface (with a deterministic, explicit-clock fixture adapter — no Suno, no scraping, no real provider). All pure functions/types — no Supabase import, no network call, no hidden clock or randomness, anywhere in `lib/catalog/`.

**Tests (Part 34):** `lib/catalog/*.test.ts`, using Node's built-in test runner (`node:test` / `node:assert`). Compiled to CommonJS via `tsconfig.catalog-test.json` before running, so the suite works on the Node 20 this repo's CI actually pins — no new testing framework, no assumption that CI runs a newer Node. Run via `npm test`. Coverage maps directly to the mission brief's required invariants — see §4/§4a/§4b below for the full list and the determinism/runtime notes.

**Migration proposals (Part 28 — not applied):** `supabase/migrations_proposed/A0`–`A5`, additive-only, each independently reversible. Kept outside `supabase/migrations/` so no CI/CD path can apply them without a human explicitly promoting a file first. See the persistence audit for slice contents and the README in that directory for the promotion procedure.

**UI (Part 20/29 — read-only foundation only):** `/admin/catalog` gained one new section ("Command Center Foundation") linking to three new stub routes:
- `/admin/catalog/intake` — explains the intake lifecycle design and links to the existing Audio Inbox (the real intake system today).
- `/admin/catalog/review` — explains the rights-state design and links to the existing `/admin/rights` and `/admin/contracts` pages.
- `/admin/catalog/routing` — explains the routing-desk design (recipes propose, humans decide).

Every one of these three pages is static, honest, and gated by `requireAdmin()` — no fake counts, no fake connection status, no fake AI state, per Part 29's explicit rule. They render zero live data because no live data exists yet for this layer.

## 2. What this pass deliberately does not do

Per Part 33's disallow-list, none of the following happened: no production DB migration applied, no production storage mutation, no source-account connection, no Suno export or scraping, no source deletion, no PersonaWorks delivery (network or otherwise), no destructive backfill, no public-site redesign. `songs`/`releases`/the CMS projection layer/public pages are untouched.

## 3. Capability vocabulary mapping (Part 4 — design only, not implemented)

The current RBAC (`owner`/`co_owner`/`admin`/`editor`/`media_manager`/`release_manager`, JWT-claim-based, enforced in both `requireAdmin()`/`isCmsRole()` and mirrored SQL `is_cms_role()`/`is_publisher_role()` RLS predicates) is **not replaced**. The future capability vocabulary from the mission brief maps onto it as follows, for a future pass to implement as an additive capability-check layer on top of (not instead of) the existing roles:

| Capability | Minimum current role |
|---|---|
| `catalog.read` | any CMS role |
| `catalog.write` | any CMS role (publish-gated per existing `is_publisher_role()` pattern) |
| `assets.upload` | `media_manager` or above |
| `assets.download_master` | *(new — no equivalent exists; would require `admin`/`owner` once the vault ships)* |
| `assets.archive` / `assets.delete` | `admin` or above |
| `editorial.route` / `editorial.approve` | `owner`/`co_owner`/`admin` (executive) |
| `rights.read` | any CMS role |
| `rights.edit` | `admin` or above |
| `rights.clear` | executive only, and never `ai` as actor (enforced in `lib/catalog/rights.ts`) |
| `destinations.personaworks` / `destinations.distribution` | executive only |
| `connections.manage` / `workers.manage` | executive only |
| `source_delete.authorize` | executive only, requires `SAFE_TO_DELETE` gate (see `lib/catalog/lineage.ts`) |
| `admin.users` / `admin.roles` | executive only |

## 4. Test coverage vs. Part 34's required invariants

| Required invariant | Covered in |
|---|---|
| unknown rights != denied | `lib/catalog/rights.test.ts` |
| unknown rights != cleared | `lib/catalog/rights.test.ts` |
| AI cannot override canonical editor value | `lib/catalog/provenance.test.ts` |
| Hard policy flags override routing recommendations | `lib/catalog/policy.test.ts`, `lib/catalog/routing.test.ts` |
| Routing recipes are proposals | `lib/catalog/routing.test.ts` |
| Destination delivery requires approval | `lib/catalog/destinations.test.ts` |
| Safe-to-delete requires every gate | `lib/catalog/intake.test.ts` (deletion-safety chain + authorization) |
| Lineage does not permit cycles | `lib/catalog/lineage.test.ts` |
| Exact hashes identify exact duplicates, and a differing hash is never treated as similarity evidence | `lib/catalog/lineage.test.ts` (`classifyDuplicate` returns `unknown`, never a similarity claim, when hashes differ or are missing) |
| No secret values serialize into public models | `lib/catalog/vault.test.ts` / `lib/catalog/destinations.test.ts` (PersonaWorks contract never carries a credential) |
| Source adapter is provider-neutral | `lib/catalog/source-adapter.test.ts` (fixture adapter, no real provider) |
| Existing public song/release behavior remains compatible | Not a `lib/catalog/` unit test — verified instead by `npm run build` succeeding with zero changes to `lib/cms/`, `app/songs/`, `app/releases/`, `app/artists/` in this diff, and by the reuse audit's explicit confirmation that `songs`/`releases` schemas and the CMS projection layer are untouched. |
| Automation workers / unauthorized humans cannot authorize source deletion | `lib/catalog/intake.test.ts` (`DeletionActor.isHuman` and `.hasSourceDeleteAuthority` are checked independently) |
| Deterministic fixtures carry no hidden clock or randomness | `lib/catalog/vault.test.ts`, `lib/catalog/source-adapter.test.ts` (`clock`/`now` are injected dependencies; same input + same injected clock produces identical output) |

Exact file names above match what shipped — see the diff for the authoritative list if this table and the tree ever drift.

### 4a. Determinism note

`lib/catalog/vault.ts`'s `createInMemoryMasterVault()` and `lib/catalog/source-adapter.ts`'s `createFixtureSourceAdapter()` are the two places in this pass that would otherwise need a timestamp. Both take an explicit clock (`clock: () => Date` / `now: () => string`) instead of calling `new Date()`/`Date.now()` internally — there is no hidden wall-clock or `Math.random()` dependency anywhere in `lib/catalog/`. `createInMemoryMasterVault()` defaults its clock to the real one only for convenience outside of determinism-sensitive tests; every test in this pass injects a fixed clock.

### 4b. Test runtime note (Node 20 CI compatibility)

`.github/workflows/ci.yml` pins Node 20, which does not support Node's native TypeScript execution (that requires Node ≥22.6 with a flag, or ≥23.6 by default) — the Codespace this pass was built in runs Node 24, which is not representative of CI. The `test` script therefore does **not** run `.ts` files directly. Instead `npm run pretest` compiles `lib/catalog/**/*.ts` to plain CommonJS JS via a dedicated `tsconfig.catalog-test.json` (using the `typescript` package already in `devDependencies` — no new dependency), and `npm test` runs `node --test` against the compiled `.test-build/lib/catalog/*.test.js`. This works on Node 18+ without any new testing framework. `.test-build/` is gitignored. CI's workflow itself does not invoke `npm test` (it only runs typecheck/lint/build) — adding that step is left to a follow-up pass, out of scope for this cleanup.

## 5. Commands run before PR

```
npm run typecheck
npm run lint
npm run build
npm test
```

Results are reported in the PR description, not fabricated here.

## 6. Next recommended pass

1. **A0 (RLS hardening)** is the lowest-risk, highest-value slice to promote first — it closes four open policies with zero schema change.
2. Promote **A1 (Work/Recording/Version/Lineage)** once a first real use case exists (e.g. a song that genuinely needs a clean + explicit master pair), rather than backfilling every existing song speculatively.
3. Build the first real `MasterVault` implementation against whatever bucket/provider the founder picks — the interface in `lib/catalog/vault.ts` is provider-neutral by design specifically so this choice can be made later without touching call sites.
4. Converge `contributors`, `publishing_works.writers`, and `rights_metadata.songwriterCredits` into one songwriter-credit model (flagged, not fixed, in the reuse audit §6) — this is a real duplication that will only get worse as the rights layer starts writing to `catalog_rights_records`.
5. Fix the plaintext `yt_channels.oauth_*` token storage using the `credentialRef` indirection pattern designed in `lib/catalog/types.ts`'s `CatalogConnection`/`CatalogSource` shapes, before generalizing `provider_connections` to Spotify/Apple Music.
6. Only after 1–5 are real: consider the PersonaWorks contract (`lib/catalog/destinations.ts`) as an actual delivery path — this pass ships the contract shape only, never a network call.
