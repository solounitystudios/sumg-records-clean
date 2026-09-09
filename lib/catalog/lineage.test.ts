import { test } from "node:test";
import assert from "node:assert/strict";
import { addLineageEdge, classifyDuplicate, getAncestors, getDescendants, isSafeToAutoDelete, LineageCycleError } from "./lineage";
import type { CatalogAssetLineageEdge } from "./types";

const NOW = "2026-01-01T00:00:00.000Z";

test("lineage does not permit direct self-parenting", () => {
  assert.throws(() => addLineageEdge([], "v1", "v1", "normalize", NOW), LineageCycleError);
});

test("lineage does not permit a cycle (A -> B -> A)", () => {
  const edges = addLineageEdge([], "v2", "v1", "normalize", NOW);
  assert.throws(() => addLineageEdge(edges, "v1", "v2", "normalize", NOW), LineageCycleError);
});

test("a valid derivation chain is accepted and ancestry is traceable", () => {
  let edges: CatalogAssetLineageEdge[] = [];
  edges = addLineageEdge(edges, "v2", "v1", "normalize", NOW);
  edges = addLineageEdge(edges, "v3", "v2", "transcode_aac", NOW);
  assert.deepEqual(getAncestors(edges, "v3"), ["v2", "v1"]);
  assert.deepEqual(getDescendants(edges, "v1"), ["v2", "v3"]);
});

test("addLineageEdge is deterministic — createdAt comes from the injected clock, not a hidden one", () => {
  const edges = addLineageEdge([], "v2", "v1", "normalize", NOW);
  assert.equal(edges[0].createdAt, NOW);
});

test("exact hashes identify exact duplicates", () => {
  assert.equal(classifyDuplicate({ sha256: "abc" }, { sha256: "abc" }), "exact_duplicate");
});

test("different hashes are classified unknown, never as similarity evidence that was never computed", () => {
  assert.equal(classifyDuplicate({ sha256: "abc" }, { sha256: "def" }), "unknown");
});

test("missing hashes never classify as an exact duplicate", () => {
  assert.equal(classifyDuplicate({ sha256: null }, { sha256: null }), "unknown");
});

test("a differing hash does not imply acoustic similarity was checked", () => {
  const result = classifyDuplicate({ sha256: "abc" }, { sha256: "xyz" });
  assert.notEqual(result, "exact_duplicate");
  assert.equal(result, "unknown");
});

test("no duplicate relationship is ever auto-deletable", () => {
  assert.equal(isSafeToAutoDelete("exact_duplicate"), false);
  assert.equal(isSafeToAutoDelete("version_relationship"), false);
  assert.equal(isSafeToAutoDelete("unknown"), false);
});
