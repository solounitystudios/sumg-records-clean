import { supabase } from "./supabase"
import { assertAiCannotClear } from "@/lib/catalog/rights"
import type { CatalogPolicyFlagRecord, CatalogRightsRecord } from "@/lib/catalog/types"
import type {
  AddPolicyFlagInput,
  PolicyFlagStore,
  RightsRecordStore,
  SetRightsRecordInput,
} from "@/lib/catalog/rights-store"

/**
 * Real, Supabase-backed implementation of lib/catalog/rights-store.ts's
 * RightsRecordStore / PolicyFlagStore interfaces, against A2's
 * catalog_rights_records / catalog_policy_flags tables.
 *
 * IMPORTANT: A2 (supabase/migrations/20260909100002_catalog_rights_policy.sql)
 * has been PROMOTED but NOT APPLIED to production as of this pass — see
 * supabase/migrations_proposed/README.md. Every function here will fail with
 * a "relation does not exist" error until a human with production access
 * explicitly applies that migration (and 20260909100001_catalog_audit_log.sql
 * before or alongside it). Nothing in this pass calls these functions from
 * any route, page, or server action — this file exists so the adapter is
 * ready and reviewable the moment the migration lands, not to be exercised
 * before then.
 */

type RightsRow = {
  id: string
  subject_type: CatalogRightsRecord["subjectType"]
  subject_id: string
  status: CatalogRightsRecord["status"]
  owner_entity: string | null
  territory: string | null
  evidence_document_id: string | null
  contract_id: string | null
  permissions: CatalogRightsRecord["permissions"]
  set_by: string | null
  set_at: string
  expires_at: string | null
}

function toRightsRecord(row: RightsRow): CatalogRightsRecord {
  return {
    id: row.id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    status: row.status,
    ownerEntity: row.owner_entity,
    territory: row.territory,
    evidenceDocumentId: row.evidence_document_id,
    contractId: row.contract_id,
    permissions: row.permissions,
    setBy: row.set_by,
    setAt: row.set_at,
    expiresAt: row.expires_at,
  }
}

type PolicyFlagRow = {
  id: string
  subject_type: CatalogPolicyFlagRecord["subjectType"]
  subject_id: string
  flag: CatalogPolicyFlagRecord["flag"]
  reason: string
  set_by: string
  set_at: string
}

function toPolicyFlagRecord(row: PolicyFlagRow): CatalogPolicyFlagRecord {
  return {
    id: row.id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    flag: row.flag,
    reason: row.reason,
    setBy: row.set_by,
    setAt: row.set_at,
  }
}

export function createSupabaseRightsRecordStore(): RightsRecordStore {
  return {
    async getRightsRecord(subject) {
      const { data, error } = await supabase
        .from("catalog_rights_records")
        .select("*")
        .eq("subject_type", subject.subjectType)
        .eq("subject_id", subject.subjectId)
        .maybeSingle()
      if (error) throw new Error(`getRightsRecord: ${error.message}`)
      return data ? toRightsRecord(data as RightsRow) : null
    },

    async setRightsRecord(input: SetRightsRecordInput, now: string) {
      // Enforced here too, not only by the DB's catalog_rights_records_ai_cannot_clear
      // CHECK constraint — don't rely solely on the database for a rule the
      // domain layer can (and does) already guarantee before a query is sent.
      assertAiCannotClear(input.status, input.setBySource)
      const { data, error } = await supabase
        .from("catalog_rights_records")
        .upsert(
          {
            subject_type: input.subjectType,
            subject_id: input.subjectId,
            status: input.status,
            owner_entity: input.ownerEntity,
            territory: input.territory,
            evidence_document_id: input.evidenceDocumentId,
            contract_id: input.contractId,
            permissions: input.permissions,
            set_by: input.setBy,
            set_by_source: input.setBySource,
            set_at: now,
            expires_at: input.expiresAt,
            updated_at: now,
          },
          { onConflict: "subject_type,subject_id" },
        )
        .select("*")
        .single()
      if (error) throw new Error(`setRightsRecord: ${error.message}`)
      return toRightsRecord(data as RightsRow)
    },
  }
}

export function createSupabasePolicyFlagStore(): PolicyFlagStore {
  return {
    async getPolicyFlags(subject) {
      const { data, error } = await supabase
        .from("catalog_policy_flags")
        .select("*")
        .eq("subject_type", subject.subjectType)
        .eq("subject_id", subject.subjectId)
        .order("set_at", { ascending: true })
      if (error) throw new Error(`getPolicyFlags: ${error.message}`)
      return (data ?? []).map((row) => toPolicyFlagRecord(row as PolicyFlagRow))
    },

    async addPolicyFlag(input: AddPolicyFlagInput, now: string) {
      const { data, error } = await supabase
        .from("catalog_policy_flags")
        .insert({
          subject_type: input.subjectType,
          subject_id: input.subjectId,
          flag: input.flag,
          reason: input.reason,
          set_by: input.setBy,
          set_at: now,
        })
        .select("*")
        .single()
      // Postgres unique_violation — the DB's own UNIQUE(subject_type, subject_id, flag)
      // constraint is the actual "already flagged" guarantee; this surfaces
      // it as the same error shape the in-memory fixture throws.
      if (error?.code === "23505") {
        throw new Error(`Flag "${input.flag}" is already set for ${input.subjectType}:${input.subjectId}`)
      }
      if (error) throw new Error(`addPolicyFlag: ${error.message}`)
      return toPolicyFlagRecord(data as PolicyFlagRow)
    },

    async removePolicyFlag(subject, flag) {
      const { error } = await supabase
        .from("catalog_policy_flags")
        .delete()
        .eq("subject_type", subject.subjectType)
        .eq("subject_id", subject.subjectId)
        .eq("flag", flag)
      if (error) throw new Error(`removePolicyFlag: ${error.message}`)
    },
  }
}
