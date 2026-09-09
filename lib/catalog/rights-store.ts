import type {
  CatalogPolicyFlagRecord,
  CatalogRightsRecord,
  CatalogSubjectRef,
  PolicyFlag,
  ProvenanceSource,
  RightsPermissions,
  RightsStatus,
} from "./types";
import { assertAiCannotClear } from "./rights";

/**
 * Persistence-facing store contracts for A2 (catalog_rights_records /
 * catalog_policy_flags — supabase/migrations/20260909100002_catalog_rights_policy.sql).
 * This file stays pure — no Supabase import, no network call, no hidden
 * clock — matching every other file in lib/catalog/. A real, Supabase-backed
 * implementation lives in lib/db/catalogRights.ts, outside this directory,
 * per the existing "lib/catalog = pure logic, lib/db = persistence" split.
 *
 * A2 has been PROMOTED but NOT APPLIED to production as of this pass — see
 * supabase/migrations_proposed/README.md. These are contracts a real backend
 * must satisfy once that migration is applied; nothing here calls one.
 */

/** Write shape for a rights-record upsert. Distinct from CatalogRightsRecord (the read shape) because setBySource is needed to enforce the AI-cannot-clear rule at write time but is not part of the stored row itself — it drives set_by/set_by_source, not a field callers read back. */
export interface SetRightsRecordInput extends CatalogSubjectRef {
  status: RightsStatus;
  ownerEntity: string | null;
  territory: string | null;
  evidenceDocumentId: string | null;
  contractId: string | null;
  permissions: RightsPermissions;
  /** Null for an automated source with no human actor. */
  setBy: string | null;
  setBySource: ProvenanceSource;
  expiresAt: string | null;
}

export interface RightsRecordStore {
  getRightsRecord(subject: CatalogSubjectRef): Promise<CatalogRightsRecord | null>;
  /**
   * Upserts the current-state rights record for a subject — mirrors the DB's
   * UNIQUE(subject_type, subject_id) shape (current-state table, history
   * lives in catalog_audit_log via A2's trigger, not here). Every
   * implementation MUST call assertAiCannotClear (or an equivalent check)
   * before writing — the DB's own CHECK constraint is defense-in-depth, not
   * the only gate, matching this repo's existing "don't rely solely on
   * application validation" rule applied in the other direction too (don't
   * rely solely on the DB either).
   */
  setRightsRecord(input: SetRightsRecordInput, now: string): Promise<CatalogRightsRecord>;
}

export interface AddPolicyFlagInput extends CatalogSubjectRef {
  flag: PolicyFlag;
  reason: string;
  setBy: string;
}

export interface PolicyFlagStore {
  getPolicyFlags(subject: CatalogSubjectRef): Promise<CatalogPolicyFlagRecord[]>;
  /** Mirrors the DB's UNIQUE(subject_type, subject_id, flag) — adding an already-set flag is rejected, not silently deduplicated, so a caller can distinguish "already flagged" from "newly flagged". */
  addPolicyFlag(input: AddPolicyFlagInput, now: string): Promise<CatalogPolicyFlagRecord>;
  removePolicyFlag(subject: CatalogSubjectRef, flag: PolicyFlag): Promise<void>;
}

function subjectKey(subject: CatalogSubjectRef): string {
  return `${subject.subjectType}:${subject.subjectId}`;
}

/**
 * Deterministic in-memory implementation used only for tests, matching the
 * discipline already established in vault.ts/source-adapter.ts: no hidden
 * clock (the caller supplies `now`), no network, no credentials, never wired
 * to a real backend.
 */
export function createInMemoryRightsRecordStore(): RightsRecordStore {
  const store = new Map<string, CatalogRightsRecord>();
  let nextId = 1;

  return {
    async getRightsRecord(subject) {
      return store.get(subjectKey(subject)) ?? null;
    },
    async setRightsRecord(input, now) {
      assertAiCannotClear(input.status, input.setBySource);
      const key = subjectKey(input);
      const existing = store.get(key);
      const record: CatalogRightsRecord = {
        id: existing?.id ?? `rights-${nextId++}`,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        status: input.status,
        ownerEntity: input.ownerEntity,
        territory: input.territory,
        evidenceDocumentId: input.evidenceDocumentId,
        contractId: input.contractId,
        permissions: input.permissions,
        setBy: input.setBy,
        setAt: now,
        expiresAt: input.expiresAt,
      };
      store.set(key, record);
      return record;
    },
  };
}

export function createInMemoryPolicyFlagStore(): PolicyFlagStore {
  const store = new Map<string, CatalogPolicyFlagRecord[]>();
  let nextId = 1;

  return {
    async getPolicyFlags(subject) {
      return store.get(subjectKey(subject)) ?? [];
    },
    async addPolicyFlag(input, now) {
      const key = subjectKey(input);
      const existing = store.get(key) ?? [];
      if (existing.some((f) => f.flag === input.flag)) {
        throw new Error(`Flag "${input.flag}" is already set for ${key}`);
      }
      const record: CatalogPolicyFlagRecord = {
        id: `policy-flag-${nextId++}`,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        flag: input.flag,
        reason: input.reason,
        setBy: input.setBy,
        setAt: now,
      };
      store.set(key, [...existing, record]);
      return record;
    },
    async removePolicyFlag(subject, flag) {
      const key = subjectKey(subject);
      const existing = store.get(key) ?? [];
      store.set(key, existing.filter((f) => f.flag !== flag));
    },
  };
}
