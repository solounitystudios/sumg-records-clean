# SUMG Review Queue, Audit Taxonomy, and Source Deletion Protocol

**Status:** Design only, 2026-09-09. Schema in `supabase/migrations_proposed/A1` (`catalog_review_flags`) and `A5` (`catalog_audit_log`); code in `lib/catalog/intake.ts` (deletion safety, unchanged this pass, referenced here).

---

## 1. Review queue — smallest safe model, challenged

**Not a full generic review-queue-with-priority-assignment system.** `review_status` on `catalog_asset_versions` already tracks single-state review progress; a whole new queue table for that alone would duplicate it. The genuine gap: **multiple independent reasons can flag the same asset version simultaneously** (e.g. `rights_unknown` AND `duplicate_hash` at once), which a single enum column structurally cannot represent. `catalog_review_flags` exists for exactly that, nothing more.

```
catalog_review_flags:
  subject_type/subject_id  — work | recording | asset_version
  reason_code               — rights_unknown, duplicate_hash, metadata_missing,
                               verification_failed, unsupported_format,
                               duration_invalid, hash_mismatch, lineage_conflict,
                               quarantine_required
  severity                  — info | review | blocked | critical
  status                     — open | resolved (current-state, mutable — resolution
                               HISTORY lives in catalog_audit_log, not duplicated here)
  detail, created_at, resolved_at, resolved_by, resolution
```

`owner_conflict` from the brief's candidate list was **dropped** — it presumes the tenancy/ownership model this product doesn't have (see `SUMG_CATALOG_PRE_PRODUCTION_HARDENING.md` §2). `quarantine_required` was kept as a reason code but note it's now largely superseded in practice by `severity='critical'` on any other reason — the brief's separate `quarantined` *state* was rejected in the intake state machine doc for the same overlap reason.

## 2. Audit event taxonomy (A5, revised)

21 events, every one CHECK-constrained (not free text) and every one traceable to a real code path or design decision in this pass — no speculative events with no planned writer:

```
intake_created            upload_started            upload_completed
verification_claimed      hash_verified              verification_passed
verification_failed       hash_mismatch               duplicate_detected
review_requested          review_approved              review_rejected
rights_changed             lineage_created
destination_route_requested   destination_route_allowed
destination_route_blocked      destination_route_rejected
source_delete_requested        source_delete_approved     source_deleted
```

Notable consolidations from the brief's raw list: `hash_verified` and `verification_passed` are kept as **two distinct** events, not merged — `hash_verified` is the specific moment the hash comparison succeeds; `verification_passed` fires when the *whole* job (hash + MIME/container + duration checks) completes successfully, which can be a superset. `destination_route_rejected` was **added** beyond the brief's three destination events, matching `destinations.ts`'s real `rejectDestination()` code path (a human choosing not to route somewhere) as distinct from `destination_route_blocked` (a hard policy flag override) — both are real, distinct outcomes in the already-shipped domain layer, so both get their own event rather than collapsing into one.

## 3. Audit actor model — resolving a real tension

`actor_type` (`human | service | worker | ai | system`) + `actor` (nullable UUID FK) + `actor_label` (always required).

**The tension, found while designing this:** a naive permanent CHECK requiring `actor_type='human' → actor IS NOT NULL` would be violated the moment that human's `auth.users` row is deleted — `ON DELETE SET NULL` performs a real UPDATE on the referencing row, which re-validates CHECK constraints, and this one would then fail (or block the user deletion entirely). That directly contradicts the "audit does not disappear if the auth user is deleted" requirement.

**Resolution:** only enforce the anti-spoofing direction permanently — `CHECK (actor_type = 'human' OR actor IS NULL)`, i.e. a non-human event may never carry a real human UUID. This never conflicts with later deletions, because non-human rows never had `actor` populated in the first place. `actor_label` is required unconditionally (for humans, an identity snapshot — e.g. email — captured by application code at insert time; for everything else, the service/worker/system identifier), so the audit trail stays *meaningful* even after a human's FK goes null — "who did this" survives as a label forever; "click through to their still-live account" does not, which is the correct, honestly-achievable guarantee. "No fake UUID users for automation" is satisfied by construction: automation can never populate a real auth.users UUID at all, by the same CHECK.

## 4. Audit immutability — proven

| Requirement | How |
|---|---|
| No ordinary UPDATE | No UPDATE policy exists on `catalog_audit_log` for any role, including admin, through the normal client |
| No ordinary DELETE | Same — no DELETE policy exists at all |
| Insert rights narrowly scoped | `is_cms_role()` INSERT policy — but in practice most inserts come from the service-role client (bypasses RLS) or the A2 rights-audit trigger (also runs with the triggering statement's privileges); this INSERT policy is defense-in-depth for a hypothetical direct client insert, not the primary write path |
| `created_at`/`occurred_at` DB-owned | **Hardened this pass** — a `DEFAULT now()` column can still be overridden by an explicit value in the INSERT statement itself, so a `CHECK (occurred_at BETWEEN now() - interval '5 minutes' AND now() + interval '5 minutes')` was added, bounding backdating/postdating even though the column technically remains client-settable |
| Actor constraints enforced | §3 |
| Automation actor cannot impersonate human | §3's anti-spoof CHECK |
| Audit does not disappear if the auth user is deleted | §3 — `ON DELETE SET NULL` + `actor_label` surviving independently |
| Service-role unrestricted INSERT acceptable? | Yes, accepted — service-role already bypasses RLS everywhere in this schema by design; the alternative (blocking service-role writes) would break every legitimate server-action-driven audit write in the system. Application code is still required to populate `actor_type`/`actor_label` correctly — the DB can't force *meaningful* structured identity, only prevent *spoofed* identity |

## 5. Source deletion safety protocol — design only, nothing implemented

`lib/catalog/intake.ts`'s `DeletionSafetyStage` state machine and `authorizeSourceDeletion()` are unchanged this pass (already correct from the foundation pass) — this section maps the brief's exact evidence checklist onto that existing design, confirming coverage rather than rebuilding it:

```
DELETE ELIGIBILITY = false by default, always.

Required evidence, mapped onto the existing 6-stage gate chain
(NOT_SECURED -> PRIMARY_COPY_VERIFIED -> SECONDARY_COPY_VERIFIED ->
 PROVENANCE_SECURED -> DESTINATIONS_VERIFIED -> SAFE_TO_DELETE):

- SUMG master object exists           -> PRIMARY_COPY_VERIFIED
- Authoritative SHA-256 verified      -> PRIMARY_COPY_VERIFIED (verified_sha256 populated)
- DB asset version verified           -> PRIMARY_COPY_VERIFIED (upload_status='verified')
- Provenance retained                 -> PROVENANCE_SECURED
- Rights state retained               -> PROVENANCE_SECURED (rights record exists, regardless of status — "retained" means recorded, not "cleared")
- Destination import/reference verified, if applicable -> DESTINATIONS_VERIFIED
- Secondary backup requirement, if policy requires it -> SECONDARY_COPY_VERIFIED
  (V1 has no second-copy requirement — see SUMG_MASTER_VAULT_SECURITY_CONTRACT.md
  §3 — so this stage is vacuously satisfied at V1, not skipped; a future pass
  that adds a real second-copy requirement would make this stage meaningful)
- Audit trail complete                -> implicit: every stage transition and the
  final authorization itself are audit events (source_delete_requested,
  source_delete_approved, source_deleted)
- Human/founder approval              -> authorizeSourceDeletion()'s DeletionActor
  requires isHuman=true AND hasSourceDeleteAuthority=true, both independently
  checked (an automation worker can never satisfy this, even with the
  authority flag set — tested in intake.test.ts)
- No active source dependency         -> DESTINATIONS_VERIFIED
```

`source_delete_requested` / `source_delete_approved` (mapped to `authorizeSourceDeletion()`'s successful output) / `source_deleted` are three separate lifecycle events in A5's taxonomy — no automatic progression between them, and `source_deleted` has no writer anywhere in this codebase (nothing implements actual deletion, this pass or any prior one). **No automatic source deletion exists or is designed to exist.**
