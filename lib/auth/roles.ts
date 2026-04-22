import { UserRole } from "@/lib/types";

/**
 * All valid user roles. Used for JWT claim validation in both middleware and
 * server-side auth helpers. Single source of truth — import from here rather
 * than duplicating inline arrays.
 */
export const ALL_ROLES: readonly UserRole[] = [
  "admin",
  "editor",
  "media_manager",
  "release_manager",
  "artist",
] as const;

/** Roles that may access the internal CMS (/admin/*). */
export const CMS_ROLES: readonly UserRole[] = [
  "admin",
  "editor",
  "media_manager",
  "release_manager",
] as const;

/** Roles that may access the ACCESS portal (/access/*). */
export const ACCESS_ROLES: readonly UserRole[] = ALL_ROLES;
