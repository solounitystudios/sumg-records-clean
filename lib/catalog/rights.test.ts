import { test } from "node:test";
import assert from "node:assert/strict";
import { assertAiCannotClear, canDistribute, hasPermission, isCleared, isDenied, isUnknown, RightsAiClearanceError } from "./rights";
import type { CatalogRightsRecord } from "./types";

const NOW = "2026-01-01T00:00:00.000Z";

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
  const base: Pick<CatalogRightsRecord, "status" | "permissions" | "expiresAt"> = {
    status: "cleared",
    permissions: { distribution: true, sync: false, personaworks: false, aiTraining: false },
    expiresAt: null,
  };
  assert.equal(canDistribute(base, NOW), true);
  assert.equal(hasPermission(base, "sync", NOW), false);
});

test("unknown status never grants permission even if flags are true", () => {
  const record: Pick<CatalogRightsRecord, "status" | "permissions" | "expiresAt"> = {
    status: "unknown",
    permissions: { distribution: true, sync: true, personaworks: true, aiTraining: true },
    expiresAt: null,
  };
  assert.equal(canDistribute(record, NOW), false);
  assert.equal(hasPermission(record, "aiTraining", NOW), false);
});

test("cleared status with no expiresAt grants permission indefinitely", () => {
  const record: Pick<CatalogRightsRecord, "status" | "permissions" | "expiresAt"> = {
    status: "cleared",
    permissions: { distribution: true, sync: false, personaworks: false, aiTraining: false },
    expiresAt: null,
  };
  assert.equal(canDistribute(record, "2099-01-01T00:00:00.000Z"), true);
});

test("cleared status with a future expiresAt still grants permission", () => {
  const record: Pick<CatalogRightsRecord, "status" | "permissions" | "expiresAt"> = {
    status: "cleared",
    permissions: { distribution: true, sync: false, personaworks: false, aiTraining: false },
    expiresAt: "2027-01-01T00:00:00.000Z",
  };
  assert.equal(canDistribute(record, NOW), true);
});

test("cleared status with a past expiresAt denies permission, even though the stored status still says cleared", () => {
  const record: Pick<CatalogRightsRecord, "status" | "permissions" | "expiresAt"> = {
    status: "cleared",
    permissions: { distribution: true, sync: false, personaworks: false, aiTraining: false },
    expiresAt: "2025-01-01T00:00:00.000Z",
  };
  assert.equal(canDistribute(record, NOW), false, "expiration must be checked at read time, not only trusted from the stored status");
});

test("expiresAt exactly equal to now is treated as expired (inclusive boundary)", () => {
  const record: Pick<CatalogRightsRecord, "status" | "permissions" | "expiresAt"> = {
    status: "cleared",
    permissions: { distribution: true, sync: false, personaworks: false, aiTraining: false },
    expiresAt: NOW,
  };
  assert.equal(canDistribute(record, NOW), false);
});
