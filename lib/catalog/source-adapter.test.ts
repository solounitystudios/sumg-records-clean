import { test } from "node:test";
import assert from "node:assert/strict";
import { createFixtureSourceAdapter, type CatalogSourceAdapter } from "./source-adapter";

/**
 * Proves the interface is provider-neutral by exercising two differently
 * configured fixture adapters through the exact same generic function,
 * which type-checks only if CatalogSourceAdapter has no provider-specific
 * leakage in its shape.
 */
async function collectTitles(adapter: CatalogSourceAdapter): Promise<(string | null)[]> {
  const refs = await adapter.discover();
  const titles: (string | null)[] = [];
  for (const ref of refs) {
    const meta = await adapter.getMetadata(ref);
    titles.push(meta.title);
  }
  return titles;
}

test("source adapter interface is provider-neutral across two distinct fixture providers", async () => {
  const providerA = createFixtureSourceAdapter({
    provider: "provider-a",
    refs: [{ sourceId: "src-a", externalRef: "ext-1" }],
    metadata: { "ext-1": { title: "Track A", artist: "Artist A", isrc: null, duration: 180, raw: {} } },
    now: () => "2026-01-01T00:00:00.000Z",
  });
  const providerB = createFixtureSourceAdapter({
    provider: "provider-b",
    refs: [{ sourceId: "src-b", externalRef: "ext-2" }],
    metadata: { "ext-2": { title: "Track B", artist: "Artist B", isrc: null, duration: 200, raw: {} } },
    now: () => "2026-01-01T00:00:00.000Z",
  });

  assert.deepEqual(await collectTitles(providerA), ["Track A"]);
  assert.deepEqual(await collectTitles(providerB), ["Track B"]);
});

test("getProvenance reports the configured provider, not a hardcoded one", async () => {
  const adapter = createFixtureSourceAdapter({ provider: "csv-import", refs: [], metadata: {}, now: () => "2026-01-01T00:00:00.000Z" });
  const provenance = await adapter.getProvenance({ sourceId: "s1", externalRef: "e1" });
  assert.equal(provenance.provider, "csv-import");
});

test("getProvenance is deterministic — same ref and same injected clock produce the same observedAt", async () => {
  const adapter = createFixtureSourceAdapter({
    provider: "csv-import",
    refs: [],
    metadata: {},
    now: () => "2026-03-14T00:00:00.000Z",
  });
  const ref = { sourceId: "s1", externalRef: "e1" };
  const first = await adapter.getProvenance(ref);
  const second = await adapter.getProvenance(ref);
  assert.equal(first.observedAt, "2026-03-14T00:00:00.000Z");
  assert.deepEqual(first, second);
});
