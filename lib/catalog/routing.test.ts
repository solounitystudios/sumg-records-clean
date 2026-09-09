import { test } from "node:test";
import assert from "node:assert/strict";
import { applyRecipe, approveRoutingDecision, proposeManualRouting, RoutingAuthorizationError } from "./routing";
import type { CatalogRoutingRecipe, CatalogSubjectRef } from "./types";

const subject: CatalogSubjectRef = { subjectType: "song", subjectId: "song-1" };
const recipe: CatalogRoutingRecipe = { id: "recipe-1", name: "Turkz Standard Intake", description: "", rules: {}, createdBy: "founder" };

test("applying a routing recipe always produces a proposed decision, never approved", () => {
  const decision = applyRecipe(recipe, subject, { destination: "sumg_artist_catalog" });
  assert.equal(decision.status, "proposed");
  assert.equal(decision.decidedBy, null);
});

test("manual routing is also born proposed", () => {
  const decision = proposeManualRouting(subject, { destination: "archive" });
  assert.equal(decision.status, "proposed");
});

test("approval requires an authorized actor", () => {
  const decision = applyRecipe(recipe, subject, {});
  assert.throws(() => approveRoutingDecision(decision, { id: "u1", isFounderOrAuthorized: false }, "2026-01-01T00:00:00.000Z"), RoutingAuthorizationError);
});

test("an authorized actor can approve a proposed decision", () => {
  const decision = applyRecipe(recipe, subject, {});
  const approved = approveRoutingDecision(decision, { id: "founder", isFounderOrAuthorized: true }, "2026-01-01T00:00:00.000Z");
  assert.equal(approved.status, "approved");
  assert.equal(approved.decidedBy, "founder");
});

test("a policy flag rejects an approval attempt for a blocked action", () => {
  const decision = applyRecipe(recipe, subject, {});
  const result = approveRoutingDecision(
    decision,
    { id: "founder", isFounderOrAuthorized: true },
    "2026-01-01T00:00:00.000Z",
    { flags: ["DO_NOT_DISTRIBUTE"], gatedAction: "distribute" }
  );
  assert.equal(result.status, "rejected");
});

test("cannot decide on a decision that is already decided", () => {
  const decision = applyRecipe(recipe, subject, {});
  const approved = approveRoutingDecision(decision, { id: "founder", isFounderOrAuthorized: true }, "2026-01-01T00:00:00.000Z");
  assert.throws(() => approveRoutingDecision(approved, { id: "founder", isFounderOrAuthorized: true }, "2026-01-01T00:00:00.000Z"));
});
