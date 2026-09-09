# SUMG Rights and Routing Model

**Status:** Design + pure code, 2026-09-09. No migration applied. Schema detail lives in `supabase/migrations_proposed/A2_rights_policy.sql`'s own comments; code lives in `lib/catalog/rights.ts`, `lib/catalog/routing-guard.ts`, `lib/catalog/destinations.ts` and their test files. This doc is the cross-cutting narrative and the explicit architecture decisions the SQL/code comments don't have room for.

---

## 1. Rights state model — explicit choice

**Option A, hardened** (current-state table + generic append-only audit log), not Option B (a dedicated append-only rights-event table) and not a justified alternative. Reasoning:

Option B (a parallel `catalog_rights_events` history table, separate from A5's generic audit log) was considered and rejected: it would duplicate exactly what A5 already exists to do, for one specific entity type — precisely the "overbuilt schema" this whole pass was asked to avoid. The real problem with the *original* Option A (from the production-verification pass) wasn't the architecture, it was that the audit trail depended on application code remembering to write it — a hope, not a guarantee.

**The fix: a DB trigger.** `catalog_rights_records_audit_trg` fires on every INSERT/UPDATE and unconditionally writes a `rights_changed` event to `catalog_audit_log` with the full before/after state. This makes the guarantee structural — no code path, including a future direct-SQL fix or a service-role bug, can change rights state without leaving a trail. `catalog_rights_records` itself stays a mutable current-state table (`UNIQUE(subject_type, subject_id)` — one row per subject, updated in place); the *history* is the trigger-fed audit log, not a second table.

**This decision has a real cost, found while implementing it:** the trigger makes A2 depend on A5 existing at *runtime* (not DDL-time — Postgres doesn't statically check a function body's table references). The previously-published "all seven proposal files are independently applicable in any order" claim no longer holds for A2. See `supabase/migrations_proposed/README.md` and `SUMG_CATALOG_PRE_PRODUCTION_HARDENING.md`'s migration rehearsal section for the full account — this is flagged prominently, not buried, because it's exactly the kind of thing "don't assume the order stays correct" was testing for.

```
CURRENT STATE:  catalog_rights_records, UNIQUE(subject_type, subject_id), mutable
HISTORY:        catalog_audit_log, action='rights_changed', DB-trigger-fed, immutable
MUTATION MODEL: UPDATE in place; the trigger captures before/after automatically
ACTOR:          set_by (UUID -> auth.users, nullable) + set_by_source (provenance vocabulary)
TIMESTAMPS:     set_at (this record's own timestamp) + occurred_at (the audit event's, DB-bounded — see A5)
EXPIRATION:     expires_at (nullable) — checked at permission-check time (§3), not just relied on from a background job
SUPERSESSION:   implicit — there's only ever one current row per subject, so "superseding" a rights grant is just the next UPDATE; the trigger captures the transition
AUDIT LINKAGE:  automatic (DB trigger), not application-code-dependent
```

## 2. Permissions model

Kept the existing, already-implemented vocabulary — `distribution`/`sync`/`personaworks`/`aiTraining` — **not** the task brief's candidate list (`play_internal`/`stream_personaworks`/`public_stream`/`distribute_dsp`/`publish_video`/`create_derivative`/`sync_license`/`download_master`). The brief itself said "do NOT automatically use this list if the existing product vocabulary differs" — it differs, deliberately: the four kept flags map onto `lib/catalog/destinations.ts`'s real, already-tested `CatalogDestination` routing (`DESTINATION_GATED_ACTION`), while the candidate eight map onto nothing currently built. Adopting eight speculative flags with zero readers would itself be the overbuilt schema this pass is trying to avoid.

**New this pass — DB-validated shape**, closing a real gap (previously any JSONB object was accepted):

```sql
CHECK (
  permissions ?& ARRAY['distribution','sync','personaworks','aiTraining']
  AND (permissions - 'distribution' - 'sync' - 'personaworks' - 'aiTraining') = '{}'::jsonb
  AND jsonb_typeof(permissions->'distribution') = 'boolean'  -- (and the other 3)
)
```

Exactly these four keys, each a JSON boolean, no more, no less, no typos, no unknown-key drift. A permissions-schema-version column was considered and rejected: nothing reads one yet, and a future vocabulary change is a one-line CHECK-constraint migration regardless of whether a version column exists.

**Defaults, matching the locked semantics exactly:**

```
unknown      -> permissions irrelevant (hasPermission() short-circuits on status alone)
under_review -> permissions irrelevant (same)
cleared      -> only the explicit true flags actually grant anything
restricted   -> explicit subset (the one status where permission flags are consulted without status='cleared')
denied       -> permissions irrelevant
expired      -> permissions irrelevant (and now, checked live via expiresAt even if status hasn't been flipped yet)
```

## 3. AI may never clear rights — DB-level proof

Unchanged mechanism, re-verified against every case the brief asked to test:

```sql
CHECK (NOT (status = 'cleared' AND set_by_source IN ('ai_inferred', 'telemetry_learned')))
```

| Test case | Result |
|---|---|
| NULL provenance | Structurally impossible — `set_by_source` is `NOT NULL` with a closed CHECK-constrained vocabulary; there is no unrecognized-string escape hatch |
| Service-role bypass | **Does not bypass this** — CHECK constraints apply to every writer including `service_role`; RLS can be bypassed by service-role, a table CHECK constraint cannot |
| Direct SQL | Same — the constraint is structural, not application-layer, so a raw `UPDATE ... SET status='cleared'` from any client (including a future admin SQL console) is rejected the same way |
| `under_review → cleared` by an AI source | Rejected — the constraint doesn't care about the *previous* status, only that the *new* row can never combine `status='cleared'` with an AI-flavored `set_by_source` |

App-level (`lib/catalog/rights.ts::assertAiCannotClear`) remains the primary check — better error messages, runs before any DB round-trip — with the DB CHECK as the backstop that closes every bypass path the app-level check can't structurally guarantee against.

## 4. Rights routing guard — `canRouteAsset` (`lib/catalog/routing-guard.ts`, new this pass)

Pure function, no writes, no network call:

```ts
canRouteAsset({ rightsStatus, permissions, expiresAt, destination, purpose, now }): { allowed: boolean; reason: string }
```

`purpose` is a `RightsAction` (the same distribution/sync/personaworks/aiTraining vocabulary), not a separate ad-hoc string — reusing the real vocabulary instead of inventing a parallel one. `destination` is retained as descriptive context (a future audit event needs to know the actual destination even though the boolean decision is governed by `purpose`), not a second independent gate — more than one destination can share the same underlying right (e.g. `sumg_public` and `social` can both be distribution-governed).

**Full matrix, tested exhaustively in `routing-guard.test.ts`:**

```
unknown      -> blocked, unconditionally (routing needs affirmative clearance)
under_review -> blocked, unconditionally
denied       -> blocked, unconditionally
expired      -> blocked, unconditionally
restricted   -> allowed ONLY where the specific permission flag is explicitly true
cleared      -> STILL requires the specific permission flag — status alone is never enough
(cleared or restricted) + expiresAt in the past as of `now` -> blocked, regardless of status
```

The specific case the brief called out — **PersonaWorks must not receive an asset merely because `status=cleared`** — is directly tested: a record with `distribution`/`sync`/`aiTraining` all `true` but `personaworks: false` is correctly denied when `purpose='personaworks'`.

This function does **not** check hard policy flags (`DO_NOT_DISTRIBUTE` etc.) — that's `lib/catalog/policy.ts`'s job, already composed into `destinations.ts::approveDestination()`. A real approval flow calls both; this function stays scoped to rights only, avoiding duplicating policy-flag logic in two places.

## 5. SUMG → PersonaWorks contract V1 — refined

`lib/catalog/types.ts::CatalogPersonaWorksDeliveryContract` (now v1.1) and `lib/catalog/destinations.ts::buildPersonaWorksContract()`. Every field challenged against the brief's candidate list:

| Field | Kept? | Why |
|---|---|---|
| `sumgCatalogId`/`workId`/`recordingId`/`assetVersionId` | Yes | Canonical identity — PersonaWorks references SUMG's IDs, never mints its own for the same object |
| `versionKind` | **Added this pass** | "Version" from the brief's list — which cut this is (master/clean/explicit/...) |
| `assetReference.vaultObjectRef` | Yes, unchanged | Opaque, never independently resolvable — resolving it into an actual signed read is PersonaWorks's own future integration responsibility (a callback to SUMG), not embedded in this snapshot. Embedding a real signed URL here would need refresh mechanics that don't exist and would let a stale link outlive its intended window |
| `assetReference.sha256` → **renamed** `verifiedSha256` | Yes, renamed | Makes explicit which of the two hash columns this is — never the client-advisory one |
| `mimeType` | **Added this pass** | Was missing; PersonaWorks needs to know the container to play the reference back once resolved |
| `rightsStatus` | Yes | Snapshot at handoff time |
| `rightsPermissions` | **Added this pass** | Previously only the single `personaworksPermission` boolean was included — the brief asked for a full "rights permissions snapshot." PersonaWorks now sees the complete flag set (still only *reads* `personaworksPermission` to know whether it may treat the delivery as valid, but has visibility into the others for its own downstream logic) |
| `availabilityState` | **Added this pass, and now enforced, not just descriptive** | Whether SUMG considers this asset version actually ready for handoff — derived from `uploadStatus='verified' AND reviewStatus='approved'`, never from rights alone. `buildPersonaWorksContract` now **throws** if the asset isn't both verified and reviewed, even when rights are fully cleared — closing a real gap: rights could legitimately be cleared before technical verification or editorial review finish, and nothing previously stopped a contract from being built in that window |
| `provenanceId` | Yes | Traceability back to the provenance record that justified this handoff |

**PersonaWorks must not become the authority for master ownership, rights state, or catalog lineage — proven by construction, not just asserted:** the contract carries only a snapshot (values copied out, not references PersonaWorks could later "correct"); the vault reference is opaque and unresolvable without calling back to SUMG; there is no field or mechanism anywhere in this contract that lets PersonaWorks write back into SUMG's rights/catalog tables — this pass ships zero network code, zero PersonaWorks-facing API, by design. SUMG remains canonical.
