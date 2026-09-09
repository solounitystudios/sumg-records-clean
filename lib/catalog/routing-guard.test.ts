import { test } from "node:test";
import assert from "node:assert/strict";
import { canRouteAsset } from "./routing-guard";
import type { RightsPermissions, RightsStatus } from "./types";

const NOW = "2026-01-01T00:00:00.000Z";
const ALL_TRUE: RightsPermissions = { distribution: true, sync: true, personaworks: true, aiTraining: true };
const ALL_FALSE: RightsPermissions = { distribution: false, sync: false, personaworks: false, aiTraining: false };

function check(rightsStatus: RightsStatus, permissions: RightsPermissions, opts?: { expiresAt?: string | null }) {
  return canRouteAsset({
    rightsStatus,
    permissions,
    expiresAt: opts?.expiresAt ?? null,
    destination: "personaworks",
    purpose: "personaworks",
    now: NOW,
  });
}

test("unknown is blocked from routing even with all permission flags true", () => {
  const result = check("unknown", ALL_TRUE);
  assert.equal(result.allowed, false);
});

test("under_review is blocked", () => {
  assert.equal(check("under_review", ALL_TRUE).allowed, false);
});

test("denied is blocked", () => {
  assert.equal(check("denied", ALL_TRUE).allowed, false);
});

test("expired status is blocked", () => {
  assert.equal(check("expired", ALL_TRUE).allowed, false);
});

test("restricted is blocked when the specific permission is false", () => {
  assert.equal(check("restricted", ALL_FALSE).allowed, false);
});

test("restricted is allowed when the specific permission is explicitly true", () => {
  assert.equal(check("restricted", ALL_TRUE).allowed, true);
});

test("cleared status alone does not grant routing — the specific permission must also be true", () => {
  assert.equal(check("cleared", ALL_FALSE).allowed, false);
});

test("cleared status with the specific permission true is allowed", () => {
  assert.equal(check("cleared", ALL_TRUE).allowed, true);
});

test("PersonaWorks must not receive an asset merely because status=cleared — it needs permissions.personaworks specifically", () => {
  const partiallyCleared: RightsPermissions = { distribution: true, sync: true, personaworks: false, aiTraining: true };
  const result = canRouteAsset({
    rightsStatus: "cleared",
    permissions: partiallyCleared,
    expiresAt: null,
    destination: "personaworks",
    purpose: "personaworks",
    now: NOW,
  });
  assert.equal(result.allowed, false, "distribution/sync/aiTraining being cleared must not leak permission for personaworks specifically");
});

test("cleared + correct permission true, but expired as of now, is blocked", () => {
  const result = check("cleared", ALL_TRUE, { expiresAt: "2025-01-01T00:00:00.000Z" });
  assert.equal(result.allowed, false);
});

test("cleared + correct permission true, expiring in the future, is allowed", () => {
  const result = check("cleared", ALL_TRUE, { expiresAt: "2027-01-01T00:00:00.000Z" });
  assert.equal(result.allowed, true);
});

test("restricted + correct permission true, but expired, is blocked — expiry applies to restricted too, not only cleared", () => {
  const result = check("restricted", ALL_TRUE, { expiresAt: "2025-01-01T00:00:00.000Z" });
  assert.equal(result.allowed, false);
});

test("different destinations with the same purpose evaluate identically — destination is descriptive context, not a second gate", () => {
  const distribution = canRouteAsset({ rightsStatus: "cleared", permissions: ALL_TRUE, expiresAt: null, destination: "distribution", purpose: "distribution", now: NOW });
  const social = canRouteAsset({ rightsStatus: "cleared", permissions: ALL_TRUE, expiresAt: null, destination: "social", purpose: "distribution", now: NOW });
  assert.equal(distribution.allowed, true);
  assert.equal(social.allowed, true);
});

test("every non-allowed result carries a human-readable reason, not just a boolean", () => {
  const result = check("unknown", ALL_TRUE);
  assert.equal(typeof result.reason, "string");
  assert.ok(result.reason.length > 0);
});
