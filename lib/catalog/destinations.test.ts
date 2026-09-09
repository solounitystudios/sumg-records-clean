import { test } from "node:test";
import assert from "node:assert/strict";
import { approveDestination, buildPersonaWorksContract, markDelivered, requestDestination } from "./destinations";
import type { CatalogRightsRecord, CatalogSubjectRef } from "./types";

const subject: CatalogSubjectRef = { subjectType: "song", subjectId: "song-1" };

test("delivery requires the assignment to already be approved", () => {
  const requested = requestDestination(subject, "distribution");
  assert.throws(() => markDelivered(requested, "dest-asset-1"));
});

test("approve then deliver succeeds", () => {
  const requested = requestDestination(subject, "distribution");
  const approved = approveDestination(requested, "founder", "2026-01-01T00:00:00.000Z");
  assert.equal(approved.status, "approved");
  const delivered = markDelivered(approved, "dest-asset-1");
  assert.equal(delivered.status, "delivered");
});

test("a policy flag blocks approval and moves status to blocked, not approved", () => {
  const requested = requestDestination(subject, "distribution");
  const result = approveDestination(requested, "founder", "2026-01-01T00:00:00.000Z", ["DO_NOT_DISTRIBUTE"]);
  assert.equal(result.status, "blocked");
  assert.match(result.policyReason ?? "", /DO_NOT_DISTRIBUTE/);
});

test("cannot approve an assignment that is not in requested status", () => {
  const requested = requestDestination(subject, "sync");
  const approved = approveDestination(requested, "founder", "2026-01-01T00:00:00.000Z");
  assert.throws(() => approveDestination(approved, "founder", "2026-01-01T00:00:00.000Z"));
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
};

test("buildPersonaWorksContract succeeds when rights explicitly grant personaworks delivery", () => {
  const contract = buildPersonaWorksContract({
    sumgCatalogId: "cat-1",
    workId: "work-1",
    recordingId: "rec-1",
    assetVersionId: "ver-1",
    title: "Midnight Villa",
    artistOrPersona: "Turkz",
    project: null,
    vaultObjectRef: "vault/obj-1",
    sha256: "abc123",
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
  });
  assert.equal(contract.personaworksPermission, true);
  assert.equal(contract.contractVersion, "1.0");
});

test("buildPersonaWorksContract throws when rights do not grant personaworks delivery", () => {
  const unclearedRights: CatalogRightsRecord = { ...clearedRights, permissions: { ...clearedRights.permissions, personaworks: false } };
  assert.throws(() =>
    buildPersonaWorksContract({
      sumgCatalogId: "cat-1",
      workId: "work-1",
      recordingId: "rec-1",
      assetVersionId: "ver-1",
      title: "Midnight Villa",
      artistOrPersona: "Turkz",
      project: null,
      vaultObjectRef: "vault/obj-1",
      sha256: "abc123",
      durationSeconds: 180,
      bpm: 128,
      key: "Am",
      energy: 0.7,
      genre: "house",
      mood: "dark",
      rights: unclearedRights,
      programmingRoles: [],
      visualTraits: {},
      provenanceId: "prov-1",
    })
  );
});

test("PersonaWorks contract never carries a credential or secret field", () => {
  const contract = buildPersonaWorksContract({
    sumgCatalogId: "cat-1",
    workId: "work-1",
    recordingId: "rec-1",
    assetVersionId: "ver-1",
    title: "Midnight Villa",
    artistOrPersona: "Turkz",
    project: null,
    vaultObjectRef: "vault/obj-1",
    sha256: "abc123",
    durationSeconds: 180,
    bpm: null,
    key: null,
    energy: null,
    genre: null,
    mood: null,
    rights: clearedRights,
    programmingRoles: [],
    visualTraits: {},
    provenanceId: "prov-1",
  });
  const serialized = JSON.stringify(contract).toLowerCase();
  for (const forbidden of ["password", "secret", "token", "credential", "apikey", "api_key"]) {
    assert.equal(serialized.includes(forbidden), false, `contract JSON must not contain "${forbidden}"`);
  }
});
