import { test } from "node:test";
import assert from "node:assert/strict";
import {
  advanceDeletionSafety,
  advanceIntake,
  authorizeSourceDeletion,
  canAdvanceDeletionSafety,
  canAdvanceIntake,
  DeletionActorNotAuthorizedError,
  DeletionNotSafeError,
  IntakeTransitionError,
  type DeletionActor,
} from "./intake";

test("intake stages advance one step at a time", () => {
  assert.equal(advanceIntake("DISCOVERED", "EXPORTING"), "EXPORTING");
});

test("intake cannot skip stages", () => {
  assert.throws(() => advanceIntake("DISCOVERED", "VERIFIED"), IntakeTransitionError);
});

test("intake can be archived from any non-archived stage as an escape hatch", () => {
  assert.equal(advanceIntake("ANALYZING", "ARCHIVED"), "ARCHIVED");
});

test("ARCHIVED is terminal — nothing can leave it", () => {
  assert.equal(canAdvanceIntake("ARCHIVED", "DISCOVERED"), false);
  assert.equal(canAdvanceIntake("ARCHIVED", "ARCHIVED"), false);
});

test("a rejected routing decision can send an item from ROUTED back to NEEDS_ROUTING for rework", () => {
  assert.equal(canAdvanceIntake("ROUTED", "NEEDS_ROUTING"), true);
  assert.equal(advanceIntake("ROUTED", "NEEDS_ROUTING"), "NEEDS_ROUTING");
});

test("a rejected rights review can send an item from RIGHTS_REVIEW back to NEEDS_ROUTING for rework", () => {
  assert.equal(canAdvanceIntake("RIGHTS_REVIEW", "NEEDS_ROUTING"), true);
  assert.equal(advanceIntake("RIGHTS_REVIEW", "NEEDS_ROUTING"), "NEEDS_ROUTING");
});

test("rework paths do not open arbitrary skipping — RIGHTS_REVIEW cannot jump forward to DISTRIBUTED", () => {
  assert.equal(canAdvanceIntake("RIGHTS_REVIEW", "DISTRIBUTED"), false);
});

test("NEEDS_ROUTING cannot skip back past its defined rework target", () => {
  assert.equal(canAdvanceIntake("NEEDS_ROUTING", "DISCOVERED"), false);
});

test("safe-to-delete requires every gate in order — cannot skip to SAFE_TO_DELETE", () => {
  assert.equal(canAdvanceDeletionSafety("NOT_SECURED", "SAFE_TO_DELETE"), false);
});

const humanWithAuthority: DeletionActor = { actorId: "founder-1", isHuman: true, hasSourceDeleteAuthority: true };
const humanWithoutAuthority: DeletionActor = { actorId: "editor-1", isHuman: true, hasSourceDeleteAuthority: false };
const automationWorker: DeletionActor = { actorId: "worker-1", isHuman: false, hasSourceDeleteAuthority: true };

test("an automation worker cannot authorize deletion, even with the authority flag set", () => {
  assert.throws(
    () => authorizeSourceDeletion("SAFE_TO_DELETE", automationWorker, "2026-01-01T00:00:00.000Z"),
    DeletionActorNotAuthorizedError
  );
});

test("an unauthorized human cannot authorize deletion", () => {
  assert.throws(
    () => authorizeSourceDeletion("SAFE_TO_DELETE", humanWithoutAuthority, "2026-01-01T00:00:00.000Z"),
    DeletionActorNotAuthorizedError
  );
});

test("an authorized human cannot authorize deletion before SAFE_TO_DELETE", () => {
  assert.throws(
    () => authorizeSourceDeletion("DESTINATIONS_VERIFIED", humanWithAuthority, "2026-01-01T00:00:00.000Z"),
    DeletionNotSafeError
  );
});

test("an authorized human at SAFE_TO_DELETE can create an authorization", () => {
  const auth = authorizeSourceDeletion("SAFE_TO_DELETE", humanWithAuthority, "2026-01-01T00:00:00.000Z");
  assert.equal(auth.authorizedBy, "founder-1");
  assert.equal(auth.stageAtAuthorization, "SAFE_TO_DELETE");
});

test("deletion authorization succeeds only once every gate has passed sequentially", () => {
  let stage: Parameters<typeof advanceDeletionSafety>[0] = "NOT_SECURED";
  stage = advanceDeletionSafety(stage, "PRIMARY_COPY_VERIFIED");
  stage = advanceDeletionSafety(stage, "SECONDARY_COPY_VERIFIED");
  stage = advanceDeletionSafety(stage, "PROVENANCE_SECURED");
  stage = advanceDeletionSafety(stage, "DESTINATIONS_VERIFIED");
  stage = advanceDeletionSafety(stage, "SAFE_TO_DELETE");
  const auth = authorizeSourceDeletion(stage, humanWithAuthority, "2026-01-01T00:00:00.000Z");
  assert.equal(auth.authorizedBy, "founder-1");
  assert.equal(auth.stageAtAuthorization, "SAFE_TO_DELETE");
});

test("authorizing deletion never itself performs a deletion (pure function, no side effects, no return of a delete op)", () => {
  const auth = authorizeSourceDeletion("SAFE_TO_DELETE", humanWithAuthority, "2026-01-01T00:00:00.000Z");
  assert.equal(typeof auth, "object");
  assert.equal("delete" in auth, false);
});
