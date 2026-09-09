import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createInMemoryPolicyFlagStore,
  createInMemoryRightsRecordStore,
  type SetRightsRecordInput,
} from "./rights-store";
import { RightsAiClearanceError } from "./rights";

const NOW = "2026-01-01T00:00:00.000Z";

const ALL_FALSE = { distribution: false, sync: false, personaworks: false, aiTraining: false };

function baseInput(overrides: Partial<SetRightsRecordInput> = {}): SetRightsRecordInput {
  return {
    subjectType: "song",
    subjectId: "song-1",
    status: "unknown",
    ownerEntity: null,
    territory: null,
    evidenceDocumentId: null,
    contractId: null,
    permissions: ALL_FALSE,
    setBy: "founder-1",
    setBySource: "founder_assigned",
    expiresAt: null,
    ...overrides,
  };
}

test("getRightsRecord returns null before anything has been set", async () => {
  const store = createInMemoryRightsRecordStore();
  assert.equal(await store.getRightsRecord({ subjectType: "song", subjectId: "song-1" }), null);
});

test("setRightsRecord persists and getRightsRecord reads it back", async () => {
  const store = createInMemoryRightsRecordStore();
  const written = await store.setRightsRecord(baseInput({ status: "under_review" }), NOW);
  const read = await store.getRightsRecord({ subjectType: "song", subjectId: "song-1" });
  assert.deepEqual(read, written);
  assert.equal(written.status, "under_review");
  assert.equal(written.setAt, NOW);
});

test("setRightsRecord is an upsert — same subject twice updates in place, one record, stable id", async () => {
  const store = createInMemoryRightsRecordStore();
  const first = await store.setRightsRecord(baseInput({ status: "under_review" }), NOW);
  const second = await store.setRightsRecord(baseInput({ status: "cleared" }), "2026-02-01T00:00:00.000Z");
  assert.equal(second.id, first.id);
  assert.equal(second.status, "cleared");
});

test("setRightsRecord enforces AI-cannot-clear before ever reaching a backend", async () => {
  const store = createInMemoryRightsRecordStore();
  await assert.rejects(
    () => store.setRightsRecord(baseInput({ status: "cleared", setBy: null, setBySource: "ai_inferred" }), NOW),
    RightsAiClearanceError,
  );
  assert.equal(await store.getRightsRecord({ subjectType: "song", subjectId: "song-1" }), null);
});

test("setRightsRecord accepts a null setBy for an automated, non-clearing source", async () => {
  const store = createInMemoryRightsRecordStore();
  const written = await store.setRightsRecord(
    baseInput({ status: "under_review", setBy: null, setBySource: "imported_source" }),
    NOW,
  );
  assert.equal(written.setBy, null);
});

test("different subjects never collide", async () => {
  const store = createInMemoryRightsRecordStore();
  await store.setRightsRecord(baseInput({ subjectId: "song-1", status: "cleared", permissions: { ...ALL_FALSE, distribution: true } }), NOW);
  await store.setRightsRecord(baseInput({ subjectId: "song-2", status: "denied" }), NOW);
  const a = await store.getRightsRecord({ subjectType: "song", subjectId: "song-1" });
  const b = await store.getRightsRecord({ subjectType: "song", subjectId: "song-2" });
  assert.equal(a?.status, "cleared");
  assert.equal(b?.status, "denied");
});

test("getPolicyFlags returns an empty list before anything has been flagged", async () => {
  const store = createInMemoryPolicyFlagStore();
  assert.deepEqual(await store.getPolicyFlags({ subjectType: "song", subjectId: "song-1" }), []);
});

test("addPolicyFlag persists and getPolicyFlags reads it back", async () => {
  const store = createInMemoryPolicyFlagStore();
  const written = await store.addPolicyFlag(
    { subjectType: "song", subjectId: "song-1", flag: "DO_NOT_TRAIN_AI", reason: "founder request", setBy: "founder-1" },
    NOW,
  );
  const flags = await store.getPolicyFlags({ subjectType: "song", subjectId: "song-1" });
  assert.deepEqual(flags, [written]);
});

test("addPolicyFlag rejects setting the same flag twice for the same subject", async () => {
  const store = createInMemoryPolicyFlagStore();
  const input = { subjectType: "song" as const, subjectId: "song-1", flag: "DO_NOT_DELETE" as const, reason: "r", setBy: "founder-1" };
  await store.addPolicyFlag(input, NOW);
  await assert.rejects(() => store.addPolicyFlag(input, NOW));
});

test("a subject can carry multiple distinct flags at once", async () => {
  const store = createInMemoryPolicyFlagStore();
  await store.addPolicyFlag({ subjectType: "song", subjectId: "song-1", flag: "DO_NOT_DELETE", reason: "r1", setBy: "founder-1" }, NOW);
  await store.addPolicyFlag({ subjectType: "song", subjectId: "song-1", flag: "DO_NOT_TRAIN_AI", reason: "r2", setBy: "founder-1" }, NOW);
  const flags = await store.getPolicyFlags({ subjectType: "song", subjectId: "song-1" });
  assert.deepEqual(flags.map((f) => f.flag).sort(), ["DO_NOT_DELETE", "DO_NOT_TRAIN_AI"]);
});

test("removePolicyFlag removes only the targeted flag", async () => {
  const store = createInMemoryPolicyFlagStore();
  await store.addPolicyFlag({ subjectType: "song", subjectId: "song-1", flag: "DO_NOT_DELETE", reason: "r1", setBy: "founder-1" }, NOW);
  await store.addPolicyFlag({ subjectType: "song", subjectId: "song-1", flag: "DO_NOT_TRAIN_AI", reason: "r2", setBy: "founder-1" }, NOW);
  await store.removePolicyFlag({ subjectType: "song", subjectId: "song-1" }, "DO_NOT_DELETE");
  const flags = await store.getPolicyFlags({ subjectType: "song", subjectId: "song-1" });
  assert.deepEqual(flags.map((f) => f.flag), ["DO_NOT_TRAIN_AI"]);
});

test("removePolicyFlag on a subject with no flags is a safe no-op", async () => {
  const store = createInMemoryPolicyFlagStore();
  await assert.doesNotReject(() => store.removePolicyFlag({ subjectType: "song", subjectId: "song-1" }, "DO_NOT_DELETE"));
});
