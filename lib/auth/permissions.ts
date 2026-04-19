/**
 * lib/auth/permissions.ts
 *
 * Pure permission functions for the SUMG admin.
 *
 * Role matrix:
 *   admin           — full access
 *   release_manager — can publish releases/songs; cannot delete or change settings
 *   media_manager   — can upload/replace/delete media; cannot publish or delete entities
 *   editor          — can edit content (text, metadata) only
 */

import { UserRole } from "@/lib/types";

/** Only admins may permanently delete any entity (artists, releases, songs, etc.) */
export function canDelete(role: UserRole): boolean {
  return role === "admin";
}

/** Admins and release managers can publish releases and songs. */
export function canPublish(role: UserRole): boolean {
  return role === "admin" || role === "release_manager";
}

/** Admins and media managers can upload, replace, and delete media assets. */
export function canUploadMedia(role: UserRole): boolean {
  return role === "admin" || role === "media_manager";
}

/** All roles can edit content (text fields, metadata). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function canEditContent(_role: UserRole): boolean {
  return true;
}

/** Only admins may change site-wide settings. */
export function canChangeSettings(role: UserRole): boolean {
  return role === "admin";
}

/** Label used in the admin UI header badge. */
export function roleLabel(role: UserRole): string {
  switch (role) {
    case "admin":           return "Admin";
    case "release_manager": return "Release Mgr";
    case "media_manager":   return "Media Mgr";
    case "editor":          return "Editor";
  }
}
