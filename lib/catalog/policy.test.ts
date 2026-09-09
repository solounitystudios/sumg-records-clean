import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluatePolicyGate, isActionBlocked, overridesRecommendation } from "./policy";

test("DO_NOT_DISTRIBUTE blocks the distribute action", () => {
  assert.equal(isActionBlocked(["DO_NOT_DISTRIBUTE"], "distribute"), true);
});

test("a hard policy flag overrides a routing recommendation", () => {
  assert.equal(overridesRecommendation(["DO_NOT_PROGRAM"], "program"), true);
});

test("no flags means no override", () => {
  assert.equal(overridesRecommendation([], "distribute"), false);
});

test("evaluatePolicyGate reports which flags blocked the action", () => {
  const result = evaluatePolicyGate(["RIGHTS_HOLD", "DO_NOT_SYNC"], "sync");
  assert.equal(result.allowed, false);
  assert.deepEqual(result.blockedBy.sort(), ["DO_NOT_SYNC", "RIGHTS_HOLD"]);
});

test("an unrelated flag does not block an action it does not cover", () => {
  assert.equal(isActionBlocked(["DO_NOT_DELETE"], "distribute"), false);
});
