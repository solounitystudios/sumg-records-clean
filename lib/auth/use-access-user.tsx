"use client";

/**
 * lib/auth/use-access-user.tsx
 *
 * Client-side hook for the SUMG ACCESS portal.
 * Returns the resolved user identity including role and artist binding.
 * Extends useRole() with ACCESS-specific helpers.
 */

export { useRole as useAccessUser } from "@/lib/auth/use-role";
