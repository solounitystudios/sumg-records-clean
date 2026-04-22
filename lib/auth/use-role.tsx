"use client";

/**
 * lib/auth/use-role.tsx
 *
 * Client-side hook that resolves the current user's role.
 *
 * Behaviour:
 *   • When Supabase env vars are configured, reads the role from
 *     `app_metadata.role` / `user_metadata.role` on mount.
 *   • Falls back to "admin" in dev / seed mode (no Supabase configured)
 *     so the admin UI is fully functional without credentials.
 *   • Returns the resolved role + derived permission flags immediately
 *     (optimistic default = "admin") so components don't need to wait for
 *     the async resolution before rendering.
 *   • Also resolves `artistSlug` from `app_metadata.artist_slug` for
 *     users with the `artist` role.
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserRole } from "@/lib/types";
import {
  canDelete,
  canPublish,
  canUploadMedia,
  canEditContent,
  canChangeSettings,
  isCmsRole,
  isArtistRole,
  roleLabel,
} from "@/lib/auth/permissions";

export interface RoleContext {
  role: UserRole;
  loading: boolean;
  canDelete: boolean;
  canPublish: boolean;
  canUploadMedia: boolean;
  canEditContent: boolean;
  canChangeSettings: boolean;
  isCmsRole: boolean;
  isArtistRole: boolean;
  roleLabel: string;
  /** Set for users with the `artist` role — the CMSArtist slug they are bound to. */
  artistSlug: string | null;
}

const ALL_ROLES: UserRole[] = ["admin", "editor", "media_manager", "release_manager", "artist"];

function buildContext(role: UserRole, loading: boolean, artistSlug: string | null = null): RoleContext {
  return {
    role,
    loading,
    canDelete: canDelete(role),
    canPublish: canPublish(role),
    canUploadMedia: canUploadMedia(role),
    canEditContent: canEditContent(role),
    canChangeSettings: canChangeSettings(role),
    isCmsRole: isCmsRole(role),
    isArtistRole: isArtistRole(role),
    roleLabel: roleLabel(role),
    artistSlug,
  };
}

export function useRole(): RoleContext {
  // Start as the most restrictive role until auth is resolved.
  // AdminShell falls back to "admin" only when Supabase is not configured (dev/seed mode),
  // which is handled inside the useEffect below.
  const [ctx, setCtx] = useState<RoleContext>(() =>
    buildContext("editor", true)
  );

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // No Supabase → local dev / seed mode → treat as admin so full UI is usable
    if (!supabaseUrl?.startsWith("https://")) {
      setCtx(buildContext("admin", false));
      return;
    }

    const sb = createClient();
    sb.auth
      .getUser()
      .then(({ data }) => {
        if (data?.user) {
          const raw =
            (data.user.app_metadata?.role as string | undefined) ??
            (data.user.user_metadata?.role as string | undefined) ??
            "editor";
          const role = (ALL_ROLES.includes(raw as UserRole) ? raw : "editor") as UserRole;
          const artistSlug =
            role === "artist"
              ? ((data.user.app_metadata?.artist_slug as string | undefined) ?? null)
              : null;
          setCtx(buildContext(role, false, artistSlug));
        } else {
          setCtx(buildContext("editor", false));
        }
      })
      .catch(() => {
        setCtx(buildContext("editor", false));
      });
  }, []);

  return ctx;
}
