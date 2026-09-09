# SUMG Catalog Command Center — Locked Architecture

**Status:** Founder-approved target architecture. This document is the reference point for every future catalog PR. It does not describe what has been built yet — see `SUMG_CATALOG_IMPLEMENTATION_PLAN.md` for what this specific pass delivers, and `SUMG_CATALOG_REUSE_AUDIT.md` for what already exists.

---

## 0. Doctrine

```
ONE VAULT.
ONE CATALOG.
ONE GRAPH.
ONE ROUTING DESK.
ONE ORCHESTRATOR.
MANY SOURCES.
MANY DESTINATIONS.
```

```
AI DESCRIBES.
RULES PROTECT.
THE FOUNDER / AUTHORIZED HUMANS DECIDE.
THE GRAPH REMEMBERS.
WORKERS EXECUTE.
PERSONAWORKS LEARNS.
```

SUMG Records owns canonical catalog identity, master assets, song/work identity, recordings, versions, stems, provenance, rights, artist/persona/project identity, editorial authority, the source archive, and release/distribution/destination decisions.

PersonaWorks owns ingest readiness, programming (Programming Pools, Rotation Profiles, Programs, schedules, the planned queue, transport), Visual Runtime, audience telemetry, and network intelligence. **PersonaWorks is not directly coupled to SUMG internal tables.** It consumes a versioned delivery contract (Part 24 / §7 below) and independently ingests and verifies.

---

## 1. Canonical modeling decision

A song does not belong to *either* the Catalog Graph *or* Analysis Intelligence. Every song belongs to one canonical catalog object. The graph describes relationships between objects; intelligence attaches observations and inferences to the same object. These are views over one row, not competing owners of it.

```
WORK / SONG
 ├── Recording
 │    ├── Master v1
 │    ├── Master v2
 │    ├── Clean
 │    ├── Explicit
 │    ├── Instrumental
 │    ├── Acapella
 │    ├── Radio Edit
 │    └── Stem Set
 ├── Identity
 ├── Ownership
 ├── Provenance
 ├── Rights / Policy
 ├── Technical Facts
 ├── Music Intelligence
 ├── Editorial Decisions
 ├── Artist / Persona Relationships
 ├── Project Relationships
 ├── Destination Assignments
 ├── Programming Intelligence
 ├── Visual Intelligence
 └── Network Intelligence
```

No duplicated copies of the same master are created merely because it belongs to multiple logical categories (e.g. "it's both a release candidate and a PersonaWorks programming asset"). Categorization is a tag/role/routing decision on the one object, not a fork of the object. See `lib/catalog/types.ts` for the current-pass type shapes and `SUMG_CATALOG_REUSE_AUDIT.md` §"Work/Recording/Version mapping" for how existing `songs`/`releases` rows map into this model today.

---

## 2. Five authorities

Every fact attached to a catalog object carries one of five authorities. They are never flattened into a single generic metadata blob without provenance.

| Authority | Meaning |
|---|---|
| **FACTS** | Machine-observed (hash, duration, codec, sample rate — things a deterministic tool measured) |
| **INTELLIGENCE** | Machine-inferred (genre, mood, BPM guess, similarity — a model's opinion) |
| **EDITORIAL** | Human canonical decision (founder/authorized human said so) |
| **RIGHTS / POLICY** | Permissions and restrictions (who may do what with this object) |
| **NETWORK INTELLIGENCE** | PersonaWorks-learned behavior (audience/programming feedback loops) |

Precedence when authorities disagree on the same field:

```
FOUNDER / EDITOR CANONICAL
        >
RIGHTS / POLICY
        >
MEASURED / DETERMINISTIC
        >
TELEMETRY
        >
AI SUGGESTION
```

**AI can never overwrite a canonical human decision.** This is enforced in code, not just convention — see `lib/catalog/provenance.ts::resolveValue()` and its test coverage.

---

## 3. Provenance

Every value that isn't a raw canonical DB column carries:

```
value
source          — measured | deterministic | ai_inferred | editor_assigned | founder_assigned | telemetry_learned | imported_source
confidence       — 0..1, required when source is ai_inferred or telemetry_learned
authority        — suggestion | derived | canonical | policy
sourceVersion    — which model/import/tool version produced this
observedAt       — when the observation was made
```

See `lib/catalog/provenance.ts`.

---

## 4. Rights and hard policy flags

Rights state is one of: `unknown | under_review | cleared | restricted | denied | expired`. **`unknown` is never treated as `denied` and never treated as `cleared`** — every consumer of rights state must handle `unknown` as its own branch. AI may describe rights evidence; **AI must never set a rights record to `cleared`.**

Hard policy flags override every recommendation and every automation:

```
DO_NOT_RELEASE  DO_NOT_PROGRAM  DO_NOT_DISTRIBUTE  DO_NOT_SYNC
DO_NOT_TRAIN_AI DO_NOT_PUBLISH  DO_NOT_DELETE  PRIVATE_PERSONAL  RIGHTS_HOLD
```

See `lib/catalog/rights.ts` and `lib/catalog/policy.ts`.

---

## 5. Editorial routing

The founder (or an authorized human) decides. AI and routing recipes only propose — they never silently execute. A routing recipe produces a `CatalogRoutingDecision` in `proposed` status; only an explicit approval action transitions it to `approved`, and only an approved decision may progress a `CatalogDestinationAssignment` past `requested`. See `lib/catalog/routing.ts`.

---

## 6. Private Master Vault

Two storage domains, kept separate by policy, never by convention alone:

- **Public media** — published art, public promo, public playback assets. May be served by a public URL.
- **Private Master Vault** — masters, stems, alternate mixes, clean/explicit/instrumental/acapella versions, demos, source exports, provenance evidence, private artwork, rights evidence, licenses. Private by default, signed-URL access only, SHA-256 verified, no public master URLs, no storage credentials ever reach the client.

See `lib/catalog/vault.ts` for the provider-neutral interface (`MasterVault`) and `SUMG_CATALOG_PERSISTENCE_AUDIT.md` for how this maps onto the existing `sumg-assets` bucket.

---

## 7. PersonaWorks contract (not connected this pass)

SUMG never pushes into PersonaWorks tables directly. It hands over a versioned, self-contained delivery contract — `CatalogPersonaWorksDeliveryContract` in `lib/catalog/destinations.ts` — containing catalog IDs, asset references, hashes, technical facts, rights/permission flags, and intelligence fields. PersonaWorks independently ingests and verifies. No network call, no live coupling exists in this pass.

---

## 8. Source-to-destination flow (intake lifecycle)

```
DISCOVERED → EXPORTING → SECURED → VERIFIED → ANALYZING → NEEDS_ROUTING
  → ROUTED → RIGHTS_REVIEW → APPROVED → DISTRIBUTED → ACTIVE → ARCHIVED
```

Source deletion safety is a separate, stricter gate chain that must all pass before a `SAFE_TO_DELETE` state is reachable, and even then deletion requires an explicit authorized action — nothing in this system auto-deletes a source:

```
NOT_SECURED → PRIMARY_COPY_VERIFIED → SECONDARY_COPY_VERIFIED
  → PROVENANCE_SECURED → DESTINATIONS_VERIFIED → SAFE_TO_DELETE
```

See `lib/catalog/lineage.ts` for the state machines and their tests.

---

## 9. What this pass does and does not touch

This architecture doc describes the target, not a status report — it does not itself track what has shipped. The current pass (`feat/catalog-command-center-foundation`, base `main` @ `2affc03`) delivers the reuse audit, the persistence audit, the security audit, a pure domain layer implementing the state machines and helpers described above, tests for that layer, narrow migration *proposals* (not applied), and a small honest read-only UI addition. It does not connect PersonaWorks, does not touch production data or production storage, does not implement any source connector, and does not redesign the public site. See `SUMG_CATALOG_IMPLEMENTATION_PLAN.md` for the authoritative "what shipped" list.
