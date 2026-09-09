import { test } from "node:test";
import assert from "node:assert/strict";
import { assertCanOverwrite, canOverwrite, ProvenanceOverwriteError, resolveValue } from "./provenance";
import type { ProvenanceValue } from "./types";

function value<T>(v: T, source: ProvenanceValue<T>["source"], authority: ProvenanceValue<T>["authority"], observedAt = "2026-01-01T00:00:00.000Z"): ProvenanceValue<T> {
  return { value: v, source, authority, observedAt };
}

test("AI cannot overwrite a canonical editor-assigned value", () => {
  const canonical = value("Explicit", "editor_assigned", "canonical");
  const aiSuggestion = value("Clean", "ai_inferred", "suggestion", "2026-02-01T00:00:00.000Z");
  assert.equal(canOverwrite(canonical, aiSuggestion), false);
  assert.throws(() => assertCanOverwrite("explicitFlag", canonical, aiSuggestion), ProvenanceOverwriteError);
});

test("AI cannot overwrite a founder-assigned canonical value either", () => {
  const canonical = value(120, "founder_assigned", "canonical");
  const telemetry = value(128, "telemetry_learned", "derived", "2026-02-01T00:00:00.000Z");
  assert.equal(canOverwrite(canonical, telemetry), false);
});

test("editor can overwrite a lower-precedence measured value", () => {
  const measured = value(120, "measured", "derived");
  const editorial = value(121, "editor_assigned", "canonical", "2026-02-01T00:00:00.000Z");
  assert.equal(canOverwrite(measured, editorial), true);
});

test("first write with no current value is always allowed", () => {
  const incoming = value("x", "ai_inferred", "suggestion");
  assert.equal(canOverwrite(undefined, incoming), true);
});

test("resolveValue picks canonical over AI suggestion regardless of recency", () => {
  const older = value("Explicit", "editor_assigned", "canonical", "2020-01-01T00:00:00.000Z");
  const newer = value("Clean", "ai_inferred", "suggestion", "2026-01-01T00:00:00.000Z");
  const winner = resolveValue([older, newer]);
  assert.equal(winner?.value, "Explicit");
});

test("resolveValue breaks ties by most recent observedAt", () => {
  const a = value("A", "measured", "derived", "2026-01-01T00:00:00.000Z");
  const b = value("B", "measured", "derived", "2026-02-01T00:00:00.000Z");
  const winner = resolveValue([a, b]);
  assert.equal(winner?.value, "B");
});
