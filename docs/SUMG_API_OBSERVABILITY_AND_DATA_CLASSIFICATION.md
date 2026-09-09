# SUMG API Contracts, Data Classification, and Observability Plan

**Status:** Design only, 2026-09-09. No route/server action implemented — every command below is a future interface, not shipped code.

---

## 1. API / server action contracts

Narrow commands, not a generic CRUD endpoint — matching the existing `app/actions/*.ts` server-action convention already used throughout this codebase.

| Command | Auth | Input | Idempotency | DB writes | Storage writes | Response | Errors | Audit event | Rights implications |
|---|---|---|---|---|---|---|---|---|---|
| `createIntake` | `requireAdmin()` | title, optional song_id, optional artist_slug | via `idempotency_key` (client-generated) | `catalog_works`, `catalog_recordings`, `catalog_asset_versions` (`pending_upload`), `catalog_rights_records` (`unknown`) — one transaction | none | work/recording/asset_version IDs + signed upload URL | 409 on idempotency-key/file-metadata mismatch (§ intake state machine doc) | `intake_created`, `upload_started` | Rights record created at `unknown` — never inherits any prior state |
| `finalizeUpload` | `requireAdmin()` (same session that called `createIntake`) | asset_version_id, confirmed size | idempotent — safe to call twice, second call is a no-op if already `uploaded_unverified`+ | `upload_status` → `uploaded_unverified` | none (metadata-only existence check) | ok/error | 404 if row not found or not owned by this session's uploader, 409 if not in `pending_upload` | `upload_completed` | none |
| `getVerificationStatus` | `requireAdmin()` | asset_version_id | n/a (read-only) | none | none | `upload_status`, `catalog_verification_jobs` summary | 404 | none (reads don't audit) | none |
| `requestReview` | `requireAdmin()` | asset_version_id, reason | idempotent (no-op if already `pending_review` for the same open reason) | `catalog_review_flags` insert (open) | none | flag id | 409 if verification hasn't completed | `review_requested` | none |
| `approveAsset` | `requireAdmin()`, executive role for anything touching rights | asset_version_id | idempotent (no-op if already `approved`) | `review_status` → `approved`; optionally resolves open review flags | none | ok | 409 if not `verified` | `review_approved` | none directly — approval is editorial, not a rights change |
| `rejectAsset` | `requireAdmin()` | asset_version_id, reason | idempotent | `review_status` → `rejected` | none | ok | none beyond validation | `review_rejected` | none |
| `updateRights` | executive role only (per the original capability mapping's `rights.edit`) | subject ref, new status, permissions, evidence refs | not idempotency-keyed (an intentional state change, not a retry-prone upload) — but the DB trigger makes every call auditable regardless | `catalog_rights_records` upsert (triggers the audit write automatically) | none | updated record | `assertAiCannotClear`/CHECK-constraint rejection if `set_by_source` is AI-flavored and status is `cleared` | `rights_changed` (automatic, via trigger — not something this action has to remember to call) | The whole point of the action |
| `getDuplicateMatches` | `requireAdmin()` | asset_version_id or a raw hash | n/a (read-only) | none | none | list of matching `verified_sha256` rows | none | none | none |

## 2. Data classification matrix

| Field / class | Classification | Notes |
|---|---|---|
| Titles | INTERNAL | Not published until a Work maps to a public `songs` row through the existing, untouched CMS projection layer |
| `artist_slug` | INTERNAL | Loose reference, not itself a secret, but not public until surfaced through the existing public projection |
| Storage bucket/path (`vault_object_ref`) | SECRET-adjacent / SENSITIVE | Never exposed to any client directly — always resolved server-side into a short-lived signed URL when actually needed |
| Signed URLs | SENSITIVE, time-boxed | Short TTL by design (§ vault security contract) — treat as a bearer credential for its lifetime, never logged in full |
| `client_sha256` / `verified_sha256` | INTERNAL | Not secret, but internal — a hash of unreleased audio is still information about unreleased audio |
| Rights notes / evidence | SENSITIVE | Legal/business-sensitive; CMS-role-gated, never public |
| Rights permissions (booleans) | INTERNAL | Drives routing decisions; not itself secret but not public data |
| Verification errors (`last_error_detail`) | INTERNAL | Could contain internal file-path or system details — never surfaced to a non-admin context |
| Audit metadata (before/after JSONB) | INTERNAL, append-only | Same sensitivity as whatever it's snapshotting |
| Actor identity (`actor`, `actor_label`) | INTERNAL | Email/identity of internal staff — not published |
| **Credentials (any)** | **SECRET** | Never classified as ordinary metadata under any circumstance — see below |
| **OAuth tokens / refresh tokens** | **SECRET** | Same — the existing `yt_channels.oauth_*` plaintext-storage gap (documented, planned for Vault migration in `SUMG_PROVIDER_CREDENTIAL_SECURITY_PLAN.md`) is the cautionary example this classification exists to prevent recurring |
| Provider IDs (Spotify ID, Apple Music ID) | INTERNAL, borderline PUBLIC | Already surfaced on public artist pages in some cases — classification follows the existing CMS projection's decisions, not re-litigated here |
| Technical audio metadata (sample rate, bitrate, codec) | INTERNAL | Not secret, but internal until an asset is actually released |
| `verified_sha256`/`client_sha256` shown in the review UI | INTERNAL, truncated for display | Full hash isn't secret, but there's no reason to render the full 64 hex characters in a list view either — a UI/UX choice, not a security one |

**Never classified as ordinary metadata, unconditionally:** service-role keys, OAuth refresh/access tokens, any Supabase secret. This is the one rule the brief singled out explicitly, and it's already the practice everywhere in this codebase's existing code (confirmed across every security pass so far — no service-role key or OAuth token has ever been found stored as a "metadata" field anywhere in the 53-table production schema).

## 3. Observability plan

Metrics/events design only — no monitoring implementation, no dashboard, per the brief's own scope limit ("no production monitoring implementation required unless pure code/tests only").

```
pending_upload count                — gauge, healthy baseline unknown (no real
                                       traffic yet) — a product assumption to
                                       revisit once real intake volume exists
stale_pending_upload count           — gauge; threshold = 24h, a product
                                       assumption, not an industry standard
uploaded_unverified count            — gauge (worker backlog proxy)
verification latency                 — histogram, claim-to-completion
verification failure rate            — ratio, verification_failed / total attempts
hash mismatch count                  — counter
duplicate detection count            — counter
review backlog                       — gauge, count of open catalog_review_flags
                                       by severity
rights unknown backlog               — gauge, count of catalog_rights_records
                                       where status='unknown'
approved asset count                 — gauge
reconciliation anomalies             — gauge, by the severity classes in
                                       SUMG_MASTER_VAULT_SECURITY_CONTRACT.md §2
destination routing blocked by rights — counter, canRouteAsset() returning
                                       allowed=false, tagged by reason
audit write failures                 — counter — should be ~zero always; any
                                       non-zero value here means the A2 trigger
                                       itself is failing, which is a schema-order
                                       problem (SUMG_CATALOG_PRE_PRODUCTION_HARDENING.md
                                       §5), not a normal operational metric
```

**Thresholds stated as product assumptions only, not industry standards**, per the brief's explicit instruction: 24h staleness, 5 verification attempts, 5-minute worker lease, 5-minute signed-URL TTL for reads — every one of these numbers is a starting guess this design is built to make cheap to change (a single constant, not a schema migration), not a benchmarked or externally-validated figure.
