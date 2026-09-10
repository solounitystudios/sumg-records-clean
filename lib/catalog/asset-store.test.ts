import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertAuditActorShape,
  AuditActorShapeError,
  createInMemoryAssetCatalogStore,
  createInMemoryAuditSink,
  DuplicatePrimaryVersionError,
  ReviewFlagAlreadyOpenError,
  VaultObjectAlreadyAttachedError,
  type CatalogAuditEvent,
} from "./asset-store";
import { LineageCycleError } from "./lineage";

const NOW = "2026-02-01T00:00:00.000Z";
const LATER = "2026-02-01T01:00:00.000Z";
const HUMAN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function baseEvent(over: Partial<CatalogAuditEvent> = {}): CatalogAuditEvent {
  return {
    action: "intake_created",
    actorType: "system",
    actor: null,
    actorLabel: "manual_upload",
    objectType: "catalog_asset_versions",
    objectId: "v1",
    previousState: null,
    newState: {},
    source: "manual_upload",
    occurredAt: NOW,
    ...over,
  };
}

// ─── A5 actor-model invariant ────────────────────────────────────────────

test("assertAuditActorShape rejects a non-human actor_type carrying a real UUID (no_human_spoof)", () => {
  assert.throws(() => assertAuditActorShape(baseEvent({ actorType: "worker", actor: HUMAN })), AuditActorShapeError);
  assert.throws(() => assertAuditActorShape(baseEvent({ actorType: "system", actor: HUMAN })), AuditActorShapeError);
});

test("assertAuditActorShape accepts human+UUID, and any type with a null actor", () => {
  assert.doesNotThrow(() => assertAuditActorShape(baseEvent({ actorType: "human", actor: HUMAN, actorLabel: HUMAN })));
  assert.doesNotThrow(() => assertAuditActorShape(baseEvent({ actorType: "worker", actor: null, actorLabel: "worker-7" })));
});

test("assertAuditActorShape rejects an empty actor_label (NOT NULL + meaningless blank)", () => {
  assert.throws(() => assertAuditActorShape(baseEvent({ actorLabel: "   " })), AuditActorShapeError);
});

// ─── Full vertical slice ────────────────────────────────────────────────

async function buildSlice() {
  const audit = createInMemoryAuditSink();
  const store = createInMemoryAssetCatalogStore({ auditSink: audit });
  const work = await store.createWork({ title: "P0-003 Test Work", songId: null, createdBy: HUMAN }, NOW);
  const recording = await store.createRecording({ workId: work.id, artistSlug: "sumg-test" }, NOW);
  const version = await store.createAssetVersion(
    {
      recordingId: recording.id,
      versionKind: "master",
      source: "manual_upload",
      uploadedBy: HUMAN,
      clientSha256: "clienthash",
      mimeType: "audio/wav",
      sizeBytes: 1024,
      isPrimary: true,
    },
    NOW,
  );
  return { audit, store, work, recording, version };
}

test("createWork/createRecording/createAssetVersion persist and assemble", async () => {
  const { store, work, recording, version } = await buildSlice();
  assert.equal(work.status, "intake");
  assert.equal(recording.workId, work.id);
  assert.equal(version.recordingId, recording.id);
  assert.equal(version.uploadStatus, "pending_upload");
  assert.equal(version.reviewStatus, "pending_review");
  assert.equal(version.vaultObjectRef, null);

  const state = await store.getAssetState(version.id);
  assert.ok(state);
  assert.equal(state!.work.id, work.id);
  assert.equal(state!.recording.id, recording.id);
  assert.equal(state!.assetVersion.id, version.id);
});

test("createAssetVersion emits exactly one intake_created audit event with the human uploader as actor", async () => {
  const { audit, version } = await buildSlice();
  const intake = audit.events.filter((e) => e.action === "intake_created");
  assert.equal(intake.length, 1);
  assert.equal(intake[0].actorType, "human");
  assert.equal(intake[0].actor, HUMAN);
  assert.equal(intake[0].objectId, version.id);
  assert.equal(intake[0].previousState, null);
});

test("a second primary version on the same recording is rejected (one-primary-per-recording)", async () => {
  const { store, recording } = await buildSlice();
  await assert.rejects(
    () =>
      store.createAssetVersion(
        { recordingId: recording.id, versionKind: "master", source: "manual_upload", uploadedBy: HUMAN, isPrimary: true },
        NOW,
      ),
    DuplicatePrimaryVersionError,
  );
});

test("attachVaultObject binds the object, moves to uploaded_unverified, and refuses a second attach (no overwrite)", async () => {
  const { store, version } = await buildSlice();
  const ref = `masters/${version.recordingId}/${version.id}/original.wav`;
  const attached = await store.attachVaultObject({ assetVersionId: version.id, vaultObjectRef: ref, actor: HUMAN }, LATER);
  assert.equal(attached.vaultObjectRef, ref);
  assert.equal(attached.uploadStatus, "uploaded_unverified");
  await assert.rejects(
    () => store.attachVaultObject({ assetVersionId: version.id, vaultObjectRef: ref, actor: HUMAN }, LATER),
    VaultObjectAlreadyAttachedError,
  );
});

test("recordVerification sets verified_sha256, completes the job, and emits hash_verified + verification_passed", async () => {
  const { audit, store, version } = await buildSlice();
  const ref = `masters/${version.recordingId}/${version.id}/original.wav`;
  await store.attachVaultObject({ assetVersionId: version.id, vaultObjectRef: ref, actor: HUMAN }, LATER);
  await store.createVerificationJob(version.id, LATER);
  const verified = await store.recordVerification(
    { assetVersionId: version.id, verifiedSha256: "clienthash", workerLabel: "verify-worker-1" },
    LATER,
  );
  assert.equal(verified.uploadStatus, "verified");
  assert.equal(verified.verifiedSha256, "clienthash");

  const job = await store.getVerificationJob(version.id);
  assert.equal(job!.status, "completed");

  const actions = audit.events.map((e) => e.action);
  assert.ok(actions.includes("hash_verified"));
  assert.ok(actions.includes("verification_passed"));
  const passed = audit.events.find((e) => e.action === "verification_passed")!;
  assert.equal(passed.actorType, "worker");
  assert.equal(passed.actor, null);
  assert.equal(passed.actorLabel, "verify-worker-1");
});

test("a hash mismatch can NEVER be represented as verified (SUMG-CAT-P0-003 FIX 1)", async () => {
  // 1. client SHA = A, 2. authoritative verified SHA = B, 3. A != B
  const { audit, store, version } = await buildSlice(); // buildSlice sets clientSha256 = "clienthash"
  assert.equal(version.clientSha256, "clienthash");
  const ref = `masters/${version.recordingId}/${version.id}/original.wav`;
  await store.attachVaultObject({ assetVersionId: version.id, vaultObjectRef: ref, actor: HUMAN }, LATER);
  await store.createVerificationJob(version.id, LATER);

  const result = await store.recordVerification(
    { assetVersionId: version.id, verifiedSha256: "authoritative-B", workerLabel: "verify-worker-1" },
    LATER,
  );

  const actions = audit.events.map((e) => e.action);
  // 4. hash_mismatch event exists
  assert.ok(actions.includes("hash_mismatch"), "hash_mismatch must be emitted");
  // 5. upload_status != verified
  assert.equal(result.uploadStatus, "verification_failed");
  assert.notEqual(result.uploadStatus, "verified");
  // 6. verification_passed is NOT emitted
  assert.equal(actions.includes("verification_passed"), false, "verification_passed must NOT be emitted on a mismatch");
  assert.equal(actions.includes("hash_verified"), false, "hash_verified must NOT be emitted on a mismatch");
  assert.ok(actions.includes("verification_failed"), "verification_failed must be emitted on a mismatch");
  // 7. verification job does not report successful completion
  const job = await store.getVerificationJob(version.id);
  assert.equal(job!.status, "failed");
  assert.equal(job!.completedAt, null);
  assert.equal(job!.lastErrorCode, "hash_mismatch");
  // 8. review state surfaces hash_mismatch
  const flags = await store.listReviewFlags("asset_version", version.id);
  const mm = flags.find((f) => f.reasonCode === "hash_mismatch");
  assert.ok(mm, "an open hash_mismatch review flag must exist");
  assert.equal(mm!.status, "open");
  assert.equal(mm!.severity, "blocked");
  // 9. verified_sha256 preserves the actual authoritative hash
  assert.equal(result.verifiedSha256, "authoritative-B");
  // 10. client_sha256 remains unchanged
  assert.equal(result.clientSha256, "clienthash");
});

test("recording a mismatch twice does not throw and does not open a second flag (idempotent)", async () => {
  const { store, version } = await buildSlice();
  const ref = `masters/${version.recordingId}/${version.id}/original.wav`;
  await store.attachVaultObject({ assetVersionId: version.id, vaultObjectRef: ref, actor: HUMAN }, LATER);
  await store.recordVerification({ assetVersionId: version.id, verifiedSha256: "B", workerLabel: "w1" }, LATER);
  await assert.doesNotReject(() =>
    store.recordVerification({ assetVersionId: version.id, verifiedSha256: "B", workerLabel: "w1" }, LATER),
  );
  const flags = await store.listReviewFlags("asset_version", version.id);
  assert.equal(flags.filter((f) => f.reasonCode === "hash_mismatch" && f.status === "open").length, 1);
});

test("an absent client_sha256 is a success, not a mismatch — nothing to contradict", async () => {
  const { audit, store, recording } = await buildSlice();
  const noClaim = await store.createAssetVersion(
    { recordingId: recording.id, versionKind: "other", source: "worker_derivative", uploadedBy: null }, // no clientSha256
    LATER,
  );
  assert.equal(noClaim.clientSha256, null);
  const result = await store.recordVerification(
    { assetVersionId: noClaim.id, verifiedSha256: "authoritative-only", workerLabel: "w1" },
    LATER,
  );
  assert.equal(result.uploadStatus, "verified");
  assert.equal(result.verifiedSha256, "authoritative-only");
  const actions = audit.events.filter((e) => e.objectId === noClaim.id).map((e) => e.action);
  assert.ok(actions.includes("hash_verified"));
  assert.ok(actions.includes("verification_passed"));
  assert.equal(actions.includes("hash_mismatch"), false);
  const flags = await store.listReviewFlags("asset_version", noClaim.id);
  assert.equal(flags.length, 0);
});

test("setReviewStatus records review_approved with the human reviewer as actor", async () => {
  const { audit, store, version } = await buildSlice();
  const approved = await store.setReviewStatus({ assetVersionId: version.id, status: "approved", reviewedBy: HUMAN }, LATER);
  assert.equal(approved.reviewStatus, "approved");
  const evt = audit.events.find((e) => e.action === "review_approved")!;
  assert.equal(evt.actorType, "human");
  assert.equal(evt.actor, HUMAN);
});

// ─── Lineage ────────────────────────────────────────────────────────────

test("addLineageEdge links a normalized derivative to the original master and emits lineage_created", async () => {
  const { audit, store, recording, version } = await buildSlice();
  const derivative = await store.createAssetVersion(
    { recordingId: recording.id, versionKind: "other", source: "worker_derivative", uploadedBy: null },
    LATER,
  );
  const edge = await store.addLineageEdge(
    {
      childAssetVersionId: derivative.id,
      parentAssetVersionId: version.id,
      derivationType: "normalize",
      createdBy: HUMAN,
    },
    LATER,
  );
  assert.equal(edge.assetVersionId, derivative.id);
  assert.equal(edge.parentAssetVersionId, version.id);
  const evt = audit.events.find((e) => e.action === "lineage_created")!;
  assert.equal(evt.actorType, "human");
  assert.equal(evt.objectId, edge.id);

  const state = await store.getAssetState(version.id);
  assert.equal(state!.lineage.length, 1);
});

test("addLineageEdge rejects a cycle (parent already descends from child)", async () => {
  const { store, recording, version } = await buildSlice();
  const mid = await store.createAssetVersion(
    { recordingId: recording.id, versionKind: "other", source: "worker_derivative", uploadedBy: null },
    LATER,
  );
  await store.addLineageEdge(
    { childAssetVersionId: mid.id, parentAssetVersionId: version.id, derivationType: "normalize", createdBy: null },
    LATER,
  );
  await assert.rejects(
    () =>
      store.addLineageEdge(
        { childAssetVersionId: version.id, parentAssetVersionId: mid.id, derivationType: "normalize", createdBy: null },
        LATER,
      ),
    LineageCycleError,
  );
});

test("addLineageEdge rejects direct self-parenting", async () => {
  const { store, version } = await buildSlice();
  await assert.rejects(
    () =>
      store.addLineageEdge(
        { childAssetVersionId: version.id, parentAssetVersionId: version.id, derivationType: "normalize", createdBy: null },
        LATER,
      ),
    LineageCycleError,
  );
});

// ─── Review flags ───────────────────────────────────────────────────────

test("addReviewFlag allows multiple distinct reasons but rejects a duplicate OPEN reason", async () => {
  const { store, version } = await buildSlice();
  await store.addReviewFlag(
    { subjectType: "asset_version", subjectId: version.id, reasonCode: "rights_unknown", severity: "review", detail: null },
    NOW,
  );
  await store.addReviewFlag(
    { subjectType: "asset_version", subjectId: version.id, reasonCode: "duplicate_hash", severity: "info", detail: null },
    NOW,
  );
  await assert.rejects(
    () =>
      store.addReviewFlag(
        { subjectType: "asset_version", subjectId: version.id, reasonCode: "rights_unknown", severity: "review", detail: null },
        NOW,
      ),
    ReviewFlagAlreadyOpenError,
  );
  const flags = await store.listReviewFlags("asset_version", version.id);
  assert.equal(flags.length, 2);
});

test("resolveReviewFlag closes a flag and frees the reason to be raised again", async () => {
  const { store, version } = await buildSlice();
  const flag = await store.addReviewFlag(
    { subjectType: "asset_version", subjectId: version.id, reasonCode: "rights_unknown", severity: "review", detail: null },
    NOW,
  );
  const resolved = await store.resolveReviewFlag({ flagId: flag.id, resolvedBy: HUMAN, resolution: "rights attached" }, LATER);
  assert.equal(resolved.status, "resolved");
  assert.equal(resolved.resolvedAt, LATER);
  await assert.doesNotReject(() =>
    store.addReviewFlag(
      { subjectType: "asset_version", subjectId: version.id, reasonCode: "rights_unknown", severity: "review", detail: null },
      LATER,
    ),
  );
});

// ─── Assembled read-back ────────────────────────────────────────────────

test("getAssetState returns the full governed chain a founder reviews", async () => {
  const { store, version } = await buildSlice();
  const ref = `masters/${version.recordingId}/${version.id}/original.wav`;
  await store.attachVaultObject({ assetVersionId: version.id, vaultObjectRef: ref, actor: HUMAN }, LATER);
  await store.createVerificationJob(version.id, LATER);
  await store.recordVerification({ assetVersionId: version.id, verifiedSha256: "clienthash", workerLabel: "w1" }, LATER);
  await store.setReviewStatus({ assetVersionId: version.id, status: "approved", reviewedBy: HUMAN }, LATER);

  const state = await store.getAssetState(version.id);
  assert.ok(state);
  assert.equal(state!.assetVersion.vaultObjectRef, ref);
  assert.equal(state!.assetVersion.verifiedSha256, "clienthash");
  assert.equal(state!.assetVersion.uploadStatus, "verified");
  assert.equal(state!.assetVersion.reviewStatus, "approved");
  assert.equal(state!.verificationJob!.status, "completed");
});

test("getAssetState returns null for an unknown asset version", async () => {
  const { store } = await buildSlice();
  assert.equal(await store.getAssetState("does-not-exist"), null);
});
