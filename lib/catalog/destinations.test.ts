import { test } from "node:test";
import assert from "node:assert/strict";
import { approveDestination, buildPersonaWorksContract, markDelivered, requestDestination } from "./destinations";
import type { CatalogRightsRecord, CatalogSubjectRef } from "./types";

const subject: CatalogSubjectRef = { subjectType: "song", subjectId: "song-1" };
const NOW = "2026-01-01T00:00:00.000Z";

test("delivery requires the assignment to already be approved", () => {
  const requested = requestDestination(subject, "distribution", NOW);
  assert.throws(() => markDelivered(requested, "dest-asset-1"));
});

test("approve then deliver succeeds", () => {
  const requested = requestDestination(subject, "distribution", NOW);
  const approved = approveDestination(requested, "founder", NOW);
  assert.equal(approved.status, "approved");
  const delivered = markDelivered(approved, "dest-asset-1");
  assert.equal(delivered.status, "delivered");
});

test("a policy flag blocks approval and moves status to blocked, not approved", () => {
  const requested = requestDestination(subject, "distribution", NOW);
  const result = approveDestination(requested, "founder", NOW, ["DO_NOT_DISTRIBUTE"]);
  assert.equal(result.status, "blocked");
  assert.match(result.policyReason ?? "", /DO_NOT_DISTRIBUTE/);
});

test("cannot approve an assignment that is not in requested status", () => {
  const requested = requestDestination(subject, "sync", NOW);
  const approved = approveDestination(requested, "founder", NOW);
  assert.throws(() => approveDestination(approved, "founder", NOW));
});

test("requestDestination is deterministic — same subject/destination/clock produce the same id", () => {
  const a = requestDestination(subject, "archive", NOW);
  const b = requestDestination(subject, "archive", NOW);
  assert.equal(a.id, b.id);
});

const clearedRights: CatalogRightsRecord = {
  subjectType: "song",
  subjectId: "song-1",
  id: "rights-1",
  status: "cleared",
  ownerEntity: "SUMG",
  territory: null,
  evidenceDocumentId: null,
  contractId: null,
  permissions: { distribution: false, sync: false, personaworks: true, aiTraining: false },
  setBy: "founder",
  setAt: "2026-01-01T00:00:00.000Z",
  expiresAt: null,
};

function baseContractInput(overrides: Partial<Parameters<typeof buildPersonaWorksContract>[0]> = {}) {
  return {
    sumgCatalogId: "cat-1",
    workId: "work-1",
    recordingId: "rec-1",
    assetVersionId: "ver-1",
    versionKind: "master",
    title: "Midnight Villa",
    artistOrPersona: "Turkz",
    project: null,
    vaultObjectRef: "vault/obj-1",
    verifiedSha256: "abc123",
    mimeType: "audio/wav",
    uploadStatus: "verified",
    reviewStatus: "approved",
    durationSeconds: 180,
    bpm: 128,
    key: "Am",
    energy: 0.7,
    genre: "house",
    mood: "dark",
    rights: clearedRights,
    programmingRoles: ["opener"],
    visualTraits: {},
    provenanceId: "prov-1",
    now: NOW,
    ...overrides,
  };
}

test("buildPersonaWorksContract succeeds when rights explicitly grant personaworks delivery and the asset is verified+approved", () => {
  const contract = buildPersonaWorksContract(baseContractInput());
  assert.equal(contract.personaworksPermission, true);
  assert.equal(contract.contractVersion, "1.1");
  assert.equal(contract.availabilityState, "available");
  assert.deepEqual(contract.rightsPermissions, clearedRights.permissions);
});

test("buildPersonaWorksContract throws when rights do not grant personaworks delivery", () => {
  const unclearedRights: CatalogRightsRecord = { ...clearedRights, permissions: { ...clearedRights.permissions, personaworks: false } };
  assert.throws(() => buildPersonaWorksContract(baseContractInput({ rights: unclearedRights })));
});

test("buildPersonaWorksContract throws when rights have expired, even if status still says cleared", () => {
  const expiredRights: CatalogRightsRecord = { ...clearedRights, expiresAt: "2025-01-01T00:00:00.000Z" };
  assert.throws(() => buildPersonaWorksContract(baseContractInput({ rights: expiredRights })));
});

test("buildPersonaWorksContract throws when the asset is not yet verified, even with rights fully cleared", () => {
  assert.throws(
    () => buildPersonaWorksContract(baseContractInput({ uploadStatus: "uploaded_unverified" })),
    /not available for handoff/
  );
});

test("buildPersonaWorksContract throws when the asset is verified but not yet editorially approved", () => {
  assert.throws(
    () => buildPersonaWorksContract(baseContractInput({ reviewStatus: "pending_review" })),
    /not available for handoff/
  );
});

test("buildPersonaWorksContract throws when verifiedSha256 is null, even if upload/review status claim otherwise", () => {
  assert.throws(() => buildPersonaWorksContract(baseContractInput({ verifiedSha256: null })));
});

test("PersonaWorks contract never carries a credential or secret field", () => {
  const contract = buildPersonaWorksContract(baseContractInput());
  const serialized = JSON.stringify(contract).toLowerCase();
  for (const forbidden of ["password", "secret", "token", "credential", "apikey", "api_key"]) {
    assert.equal(serialized.includes(forbidden), false, `contract JSON must not contain "${forbidden}"`);
  }
});

test("PersonaWorks contract's asset reference is opaque — never a resolvable http(s) URL", () => {
  const contract = buildPersonaWorksContract(baseContractInput());
  assert.doesNotMatch(contract.assetReference.vaultObjectRef, /^https?:\/\//);
});
