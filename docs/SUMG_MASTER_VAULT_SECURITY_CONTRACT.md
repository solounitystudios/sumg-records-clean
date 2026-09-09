# SUMG Master Vault Security Contract

**Status:** Design only, 2026-09-09. No bucket created, no policy applied, no object uploaded. Supersedes/extends `SUMG_MASTER_VAULT_PRODUCTION_READINESS.md` (production storage audit — still accurate, not repeated here) and `SUMG_MASTER_VAULT_IMPLEMENTATION_PREFLIGHT.md` (SHA-256/transaction design — moved to `SUMG_MANUAL_INTAKE_STATE_MACHINE.md`, this doc covers what's left: the bucket's own security contract, storage↔DB reconciliation, and disaster recovery).

---

## 1. Master Vault security contract

| Property | Decision |
|---|---|
| Bucket privacy | Private (`public: false`) — non-negotiable, no exception path |
| Bucket name | `sumg-master-vault` (new — not the existing unreferenced `music` bucket, per the earlier readiness doc) |
| Upload authorization | Signed upload URL, issued server-side only after the DB row exists (§ transaction model, `SUMG_MANUAL_INTAKE_STATE_MACHINE.md`) |
| Download authorization | Signed read URL, short TTL, issued server-side, never a stored/reusable public link |
| Signed URL lifetime | 300s (5 min) for admin review/playback reads; upload URLs get a longer window (e.g. 30 min, to tolerate slow connections on large files) — both product assumptions, not guarantees |
| Object key pattern | `masters/{work_id}/{recording_id}/{asset_version_id}/original.{ext}` — every segment a server-generated UUID already committed to the DB row before the key is ever handed to a client; `{ext}` derived from the verified MIME type, never the client's filename |
| Path traversal resistance | Structural, not filtered — the key is built entirely from UUIDs and a small server-controlled extension whitelist; user-supplied text (title, original filename) never appears in the key at all, so there is no traversal surface to sanitize |
| Overwrite behavior | Never — each object key is derived from a freshly generated `asset_version_id`; a "replace this master" action creates a new asset version (and object) with a lineage edge to the old one, never an in-place overwrite |
| Object replacement | Same as above — replacement is versioning, not mutation |
| Maximum file size | 250MB |
| Accepted MIME/container | `audio/wav`, `audio/x-wav`, `audio/flac`, `audio/aiff` for masters; `audio/mpeg` accepted but UI-flagged non-master-quality |
| File extension trust | None — the extension used for the stored object key comes from the server's own MIME→extension mapping after verification, never from the client's filename or declared `Content-Type` alone |
| Server-side metadata | Object metadata carries only non-sensitive technical facts (size, mime, upload timestamp) — see the credential-shaped-metadata ban below |
| Credential-shaped metadata ban | No object metadata/tag may ever contain a secret, token, or credential value — this is a hard rule, not a scan; nothing in this design's write path ever has a credential to accidentally attach in the first place, since uploads go through a signed URL, not an authenticated API call carrying a bearer token into the object store |
| CORS | Scoped to the exact production + preview origins used for direct browser upload — never a wildcard `*` |
| Direct browser upload | Yes, via the signed upload URL — bytes never transit the Next.js server (Part 10 of the manual-intake brief: don't proxy large files through the app server) |
| Service-role use | The verification worker (streaming re-hash) and any admin signed-URL issuance use the service-role client server-side only — never exposed to a browser bundle |
| Orphan handling | Detection-only via reconciliation (§2) — never automatic deletion |
| Deletion controls | None implemented this pass — see `SUMG_REVIEW_AUDIT_AND_DELETION.md`'s source deletion protocol; nothing in this system can delete a vault object automatically, ever |

## 2. Storage ↔ database reconciliation

A read-only report, run periodically (not built this pass — this section specifies what it must detect and how to classify each finding, not the job itself).

| Anomaly | Severity | Detection | Auto-correct? | Human review? | Data-loss risk |
|---|---|---|---|---|---|
| DB row exists, no object in Storage | HIGH | Compare `catalog_asset_versions.vault_object_ref` (non-null) against a `HEAD`/existence check on the bucket | No | Yes | Low (nothing to lose — the row just points at nothing; likely an aborted upload) |
| Object in Storage, no DB row references it | MEDIUM | List vault objects, diff against every `vault_object_ref` in the DB | No | Yes | Low (object itself intact, just unlinked — possibly a row-creation failure mid-flight) |
| `uploaded_unverified` older than a threshold (e.g. 24h) with no verification job progress | MEDIUM | `WHERE upload_status='uploaded_unverified' AND updated_at < now() - interval` | No | Yes (likely a worker outage, not a data problem) | None |
| `verifying` with an expired lease not yet re-claimed | LOW | Should self-heal via the claim query (§ worker contract) — a persistent instance of this after several poll cycles indicates the worker itself is down | No | Yes, if persistent | None |
| `verified` but the object is missing from Storage | **CRITICAL** | Periodic HEAD check against every `verified_sha256`-populated row's `vault_object_ref` | No | Yes, immediately | **High — this is the one real data-loss case in the whole system** |
| Object's actual hash differs from `verified_sha256` on re-check | **CRITICAL** | Periodic re-hash (expensive — sampled or triggered, not continuous) | No | Yes, treat as retroactive `hash_mismatch` | High — implies either corruption or an unexpected external mutation of the bucket |
| Duplicate objects (same `verified_sha256`, different `vault_object_ref`) | INFO | Index scan on `verified_sha256` | No | Optional — surfaces as the normal duplicate-detection flow, not a storage problem per se | None |
| Object at an unexpected path/bucket | MEDIUM | Any object outside the expected `masters/{uuid}/{uuid}/{uuid}/original.{ext}` pattern or outside `sumg-master-vault` that the app believes it wrote | No | Yes | Depends |
| Asset version references a deleted Recording | Should be structurally impossible — `ON DELETE CASCADE` from Recording to Asset Version means the asset version is gone too, not orphaned | n/a | n/a | n/a | n/a — listed only to confirm it's already prevented by the schema, not left to reconciliation |
| Lineage references a missing version | `parent_asset_version_id` is `ON DELETE SET NULL` — a "missing parent" is a legitimate orphaned-root state, not corruption; only a dangling **child** reference (asset_version_id pointing at nothing) would be a real anomaly, and that's prevented by `ON DELETE CASCADE` on that column | n/a | n/a | n/a | n/a |

No destructive/cleanup job is designed or built this pass — the reconciliation report is read-only, surfacing findings for a human to act on, per Part 9's explicit instruction.

## 3. Disaster recovery — V1 assumptions

**Is one private Vault copy sufficient for V1? Yes, as a starting assumption, explicitly labeled as such — not a guarantee.** Supabase Storage itself provides the underlying durability (it's backed by object storage with the provider's own replication, not a single disk) — this design does not add a second, SUMG-managed copy in V1.

- **Does V1 require a second master copy?** No — deferred. The honest reasoning: production currently has zero real masters (0 rows with a populated `audio_url`, confirmed via live query across multiple passes), so building a second-copy strategy now would be designing disaster recovery for data that doesn't exist yet. Revisit once real masters start accumulating and the volume/value justifies it.
- **What happens if Storage loses an object?** Detected by the reconciliation report's CRITICAL "verified but object missing" case (§2) — not automatically recovered. If the original source file still exists wherever it was ingested from, re-upload as a new asset version with the original as a lineage parent (if traceable) is the manual recovery path. If the source is also gone, the master is lost — this is the honest, stated limit of V1's guarantee.
- **What metadata is required to reconstruct the catalog if a master is lost?** `catalog_works`/`catalog_recordings`/`catalog_asset_versions` rows survive independently of the object (the DB and the object store are not coupled for read availability) — title, technical metadata, rights, provenance, and lineage all remain queryable even with the actual audio gone. What's lost is only the audio bytes themselves.
- **What cannot be reconstructed?** The audio bytes, if both the Vault copy and the original source are gone. No amount of metadata reconstructs audio content.
- **RPO/RTO:** not defined this pass — labeled explicitly as a **product assumption gap**, not a guarantee of any specific number. Any RPO/RTO claim would require knowing Supabase Storage's own underlying durability SLA and this repo has not verified that as part of this pass; stating a number without that verification would be inventing an enterprise guarantee the task explicitly warned against.
