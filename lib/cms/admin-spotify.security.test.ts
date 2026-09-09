import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * lib/cms/admin-spotify.ts depends on next/headers (via lib/supabase/server.ts)
 * and the `server-only` guard, both of which only work inside a live Next.js
 * request — they can't be imported and executed in a plain Node test process.
 * These checks enforce the security-relevant invariants structurally, by
 * inspecting source text, instead: deterministic, fast, and they catch the
 * exact regression this module exists to prevent (silently reverting to the
 * anon client, or losing the server-only guard) without needing a browser or
 * a running server.
 */

const ROOT = join(__dirname, "..", "..");

function read(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf8");
}

test("admin-spotify.ts declares the server-only guard", () => {
  const src = read("lib/cms/admin-spotify.ts");
  assert.match(src, /^import "server-only";/m);
});

test("admin-spotify.ts uses the session-aware server client, not a fresh anon client", () => {
  const src = read("lib/cms/admin-spotify.ts");
  assert.match(src, /import \{ createClient \} from "@\/lib\/supabase\/server"/);
  assert.doesNotMatch(src, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(src, /from "@supabase\/supabase-js"/);
});

test("admin-spotify.ts never references the service-role secret", () => {
  const src = read("lib/cms/admin-spotify.ts");
  assert.doesNotMatch(src, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("lib/cms/index.ts no longer contains any artist_spotify_snapshots access", () => {
  const src = read("lib/cms/index.ts");
  assert.doesNotMatch(src, /artist_spotify_snapshots/);
  assert.doesNotMatch(src, /getArtistSpotifySnapshots/);
  assert.doesNotMatch(src, /insertArtistSpotifySnapshot/);
});

test("lib/cms/index.ts's public-content functions still use the plain anon client (unchanged)", () => {
  const src = read("lib/cms/index.ts");
  assert.match(src, /function getSupabaseClient\(\)/);
  assert.match(src, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(src, /export async function getPublishedReleases/);
});

test("every known caller imports the snapshot reader from the new admin-only module, not the old public one", () => {
  const callers = [
    "app/admin/spotify/page.tsx",
    "app/admin/analytics/page.tsx",
    "components/admin/intelligence/SpotifyArtistRow.tsx",
  ];
  for (const file of callers) {
    const src = read(file);
    assert.match(src, /from "@\/lib\/cms\/admin-spotify"/, `${file} should import from @/lib/cms/admin-spotify`);
    assert.doesNotMatch(
      src,
      /from "@\/lib\/cms"/,
      `${file} should not still import from the old bare @/lib/cms path`
    );
  }
});

test("no caller of the snapshot reader is a client component", () => {
  const callers = [
    "app/admin/spotify/page.tsx",
    "app/admin/analytics/page.tsx",
    "components/admin/intelligence/SpotifyArtistRow.tsx",
  ];
  for (const file of callers) {
    const firstNonBlankLine = read(file).split("\n").find((l) => l.trim().length > 0) ?? "";
    assert.doesNotMatch(firstNonBlankLine, /"use client"/, `${file} must not be a client component`);
  }
});

test("the real, live write path for artist_spotify_snapshots still uses the service-role client, unaffected by this change", () => {
  const src = read("app/actions/spotify.ts");
  assert.match(src, /import \{ supabase \} from "@\/lib\/db\/supabase"/);
  assert.match(src, /await requireAdmin\(\)/);
  assert.match(src, /\.from\("artist_spotify_snapshots"\)\s*\n?\s*\.insert/);
});

test("app/admin/layout.tsx still gates every admin route with requireAdmin()", () => {
  const src = read("app/admin/layout.tsx");
  assert.match(src, /requireAdmin\(\)/);
});
