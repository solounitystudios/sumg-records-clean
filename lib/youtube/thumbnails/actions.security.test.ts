/**
 * SUMG-SEC-P0-004 — Privileged Server Action Boundary Hardening
 *
 * `lib/youtube/thumbnails/actions.ts` is a `"use server"` module. In Next.js 16
 * every exported function in such a module is an independently addressable HTTP
 * endpoint: reachable by a direct POST regardless of which component imports it,
 * and NOT covered by the `requireAdmin()` calls in the admin layout / page that
 * render its UI (see node_modules/next/dist/docs/01-app/02-guides/data-security.md
 * §"Authentication and authorization": "A page-level authentication check does not
 * extend to the Server Actions defined within it. Always re-verify inside the
 * action."). Every exported action here reaches Supabase through the service-role
 * client (`lib/db/supabase.ts`), which bypasses RLS entirely.
 *
 * The invariant this suite enforces, at the source level, for EVERY current and
 * future exported action in the module:
 *
 *   authenticate + authorize  (await requireAdmin())
 *     → BEFORE any service-role read or write
 *
 * These are deterministic source-level checks rather than runtime invocation
 * because the module transitively imports `next/headers` and cannot be executed
 * outside a live Next.js request — the same constraint and approach as
 * `lib/cms/admin-spotify.security.test.ts`.
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"

const REPO_ROOT = process.cwd()
const ACTIONS_PATH = path.join(REPO_ROOT, "lib/youtube/thumbnails/actions.ts")
const AUTH_PATH = path.join(REPO_ROOT, "lib/auth.ts")

const src = readFileSync(ACTIONS_PATH, "utf8")
const authSrc = readFileSync(AUTH_PATH, "utf8")

/** Canonical authorization gate — the ONLY primitive this module may use. */
const GATE = /await\s+requireAdmin\(\s*\)/
/** First point at which a service-role capability is reached inside a body. */
const PRIVILEGED_SINK = /\badminDb\b|\bsupabase\s*\.\s*(from|storage|rpc)\b|\bsupabase\s*=\s*adminDb\b/

interface Action {
  name: string
  body: string
}

/** Split the module into one slice per exported action (signature + body). */
function parseExportedActions(source: string): Action[] {
  const re = /^export\s+async\s+function\s+([A-Za-z0-9_]+)/gm
  const starts: { name: string; index: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(source)) !== null) {
    starts.push({ name: m[1], index: m.index })
  }
  return starts.map((s, i) => ({
    name: s.name,
    body: source.slice(s.index, i + 1 < starts.length ? starts[i + 1].index : source.length),
  }))
}

const actions = parseExportedActions(src)

// Names that MUST exist and be privileged. Mix of destructive writes and reads
// that return private/internal data. A regression that drops or renames one of
// these without gating it should fail loudly.
const WRITE_ACTIONS = [
  "getOrCreateProject", "autoCreateJobAndProject", "createThumbnailJob",
  "saveProjectDraft", "addVersionByUrl", "selectVersion", "rejectVersion",
  "approveProject", "skipThumbnail", "savePromptToProject", "savePromptToLibrary",
  "createPrompt", "updatePrompt", "archivePrompt", "restorePrompt",
  "deletePromptPermanently", "duplicatePrompt", "markPromptFavorite",
  "markPromptWinner", "incrementPromptUseCount", "saveFreeCreateAsset",
  "createMidjourneyPendingAsset", "completeMidjourneyAsset", "markMidjourneyFailed",
  "deleteGenerationJob", "deleteThumbnailAsset",
]
const READ_ACTIONS = [
  "getJobsForStudio", "getProjectVersions", "getPresetsFromDb",
  "getPromptsFromLibrary", "getJobMediaAssets", "getImageAssetsForPicker",
  "getPromptLibrary", "getMidjourneyQueue", "getMidjourneyJobStatus",
]

test("every exported symbol in the module is an async Server Action (no ungated escape hatch)", () => {
  // Guards against someone adding `export const foo = ...` / `export function foo`
  // that would not be caught by the async-function loop below.
  const otherExports = src.match(/^export\s+(?!async\s+function\s)(?!type\s)(?!interface\s)\S.*$/gm) ?? []
  assert.deepEqual(
    otherExports,
    [],
    `Unexpected non-async-function export(s) in actions.ts — each must be audited for authorization:\n${otherExports.join("\n")}`,
  )
})

test("module imports the canonical requireAdmin primitive from @/lib/auth (no second role system)", () => {
  assert.match(
    src,
    /import\s*\{[^}]*\brequireAdmin\b[^}]*\}\s*from\s*["']@\/lib\/auth["']/,
    "actions.ts must import requireAdmin from @/lib/auth",
  )
  assert.doesNotMatch(
    src,
    /SUPABASE_SERVICE_ROLE_KEY|process\.env\.[A-Z_]*SERVICE_ROLE/,
    "actions.ts must not read the service-role secret directly",
  )
  // It must not re-implement role checks (JWT/app_metadata parsing, hardcoded role lists).
  assert.doesNotMatch(
    src,
    /app_metadata|auth\.jwt\(\)|\[["']owner["'],\s*["']co_owner["']/,
    "actions.ts must not re-implement authorization — delegate to requireAdmin()",
  )
})

test("at least the full known set of privileged actions is present", () => {
  const names = new Set(actions.map((a) => a.name))
  for (const n of [...WRITE_ACTIONS, ...READ_ACTIONS]) {
    assert.ok(names.has(n), `expected exported action "${n}" to exist`)
  }
  // Current total is 35; guard against silent large-scale deletion.
  assert.ok(actions.length >= 35, `expected >= 35 exported actions, found ${actions.length}`)
})

test("INVARIANT: every exported action authorizes before it reaches a service-role operation", () => {
  const failures: string[] = []
  for (const a of actions) {
    const gate = a.body.search(GATE)
    const sink = a.body.search(PRIVILEGED_SINK)
    if (gate === -1) {
      failures.push(`${a.name}: no "await requireAdmin()" in body`)
      continue
    }
    if (sink !== -1 && gate > sink) {
      failures.push(`${a.name}: service-role access at offset ${sink} occurs BEFORE requireAdmin() at offset ${gate}`)
    }
  }
  assert.deepEqual(failures, [], `Privileged Server Action(s) missing fail-closed authorization:\n${failures.join("\n")}`)
})

test("destructive WRITE actions cannot execute without authorization", () => {
  for (const n of WRITE_ACTIONS) {
    const a = actions.find((x) => x.name === n)
    assert.ok(a, `action ${n} missing`)
    assert.match(a!.body, GATE, `${n} (WRITE) must call requireAdmin()`)
    assert.ok(
      a!.body.search(GATE) < (a!.body.search(PRIVILEGED_SINK) === -1 ? Infinity : a!.body.search(PRIVILEGED_SINK)),
      `${n} (WRITE) must authorize before any service-role write`,
    )
  }
})

test("READ actions that expose private/internal data cannot execute without authorization", () => {
  for (const n of READ_ACTIONS) {
    const a = actions.find((x) => x.name === n)
    assert.ok(a, `action ${n} missing`)
    assert.match(a!.body, GATE, `${n} (READ) must call requireAdmin()`)
    assert.ok(
      a!.body.search(GATE) < (a!.body.search(PRIVILEGED_SINK) === -1 ? Infinity : a!.body.search(PRIVILEGED_SINK)),
      `${n} (READ) must authorize before any service-role query`,
    )
  }
})

test("requireAdmin() is a real fail-closed gate: denies unauthenticated and non-executive callers", () => {
  // We assert the shape of the canonical primitive rather than execute it
  // (lib/auth.ts imports next/navigation + next/headers).
  assert.match(
    authSrc,
    /export\s+async\s+function\s+requireAdmin\s*\(/,
    "lib/auth.ts must export requireAdmin",
  )
  // Unauthenticated → redirect away (no user object).
  assert.match(
    authSrc,
    /requireAdmin[\s\S]{0,200}?if\s*\(\s*!user\s*\)\s*redirect\(/,
    "requireAdmin must redirect when there is no authenticated user",
  )
  // Authenticated but not executive → redirect away.
  assert.match(
    authSrc,
    /requireAdmin[\s\S]{0,300}?if\s*\(\s*!isExecutiveRole\([\s\S]*?\)\s*\)\s*redirect\(/,
    "requireAdmin must redirect when the user is not an executive role",
  )
  // Executive roles are exactly owner / co_owner / admin — unchanged by this PR.
  assert.match(
    authSrc,
    /EXECUTIVE_ROLES\s*=\s*\[\s*["']owner["']\s*,\s*["']co_owner["']\s*,\s*["']admin["']\s*\]/,
    "EXECUTIVE_ROLES definition changed — this PR must not redesign RBAC",
  )
  assert.match(
    authSrc,
    /getAuthUser\(\)[\s\S]{0,80}?supabase\.auth\.getUser\(\)|supabase\.auth\.getUser\(\)/,
    "getAuthUser must resolve identity via supabase.auth.getUser()",
  )
})
