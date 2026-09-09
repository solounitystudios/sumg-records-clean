import { test } from "node:test";
import assert from "node:assert/strict";
import { assertAiCannotClear, canDistribute, hasPermission, isCleared, isDenied, isUnknown, RightsAiClearanceError } from "./rights";
import type { CatalogRightsRecord } from "./types";

test("unknown rights status is not denied", () => {
  assert.equal(isDenied("unknown"), false);
});

test("unknown rights status is not cleared", () => {
  assert.equal(isCleared("unknown"), false);
});

test("unknown rights status is recognized as unknown", () => {
  assert.equal(isUnknown("unknown"), true);
  assert.equal(isUnknown("denied"), false);
  assert.equal(isUnknown("cleared"), false);
});

test("AI cannot set rights to cleared", () => {
  assert.throws(() => assertAiCannotClear("cleared", "ai_inferred"), RightsAiClearanceError);
  assert.throws(() => assertAiCannotClear("cleared", "telemetry_learned"), RightsAiClearanceError);
});

test("a human founder can set rights to cleared", () => {
  assert.doesNotThrow(() => assertAiCannotClear("cleared", "founder_assigned"));
});

test("AI setting a non-cleared status is fine", () => {
  assert.doesNotThrow(() => assertAiCannotClear("under_review", "ai_inferred"));
});

test("permission requires status cleared AND the specific flag", () => {
  const base: Pick<CatalogRightsRecord, "status" | "permissions"> = {
    status: "cleared",
    permissions: { distribution: true, sync: false, personaworks: false, aiTraining: false },
  };
  assert.equal(canDistribute(base), true);
  assert.equal(hasPermission(base, "sync"), false);
});

test("unknown status never grants permission even if flags are true", () => {
  const record: Pick<CatalogRightsRecord, "status" | "permissions"> = {
    status: "unknown",
    permissions: { distribution: true, sync: true, personaworks: true, aiTraining: true },
  };
  assert.equal(canDistribute(record), false);
  assert.equal(hasPermission(record, "aiTraining"), false);
});
