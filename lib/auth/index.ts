import { createClient } from "@/lib/supabase/server";
import { AuthSession, CMSUser } from "@/lib/types";

/**
 * Resolves the current Supabase auth session on the server.
 * Works in Server Components, Server Actions, and Route Handlers.
 */
export async function getSession(): Promise<AuthSession> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { user: null, isAuthenticated: false, isAdmin: false, isEditor: false, isMediaManager: false, isReleaseManager: false };
    }

    // Role is stored in user_metadata.role or app_metadata.role
    const rawRole =
      (user.app_metadata?.role as string | undefined) ??
      (user.user_metadata?.role as string | undefined) ??
      "editor";

    const validRoles = ["admin", "editor", "media_manager", "release_manager"];
    const role = validRoles.includes(rawRole) ? rawRole : "editor";

    const cmsUser: CMSUser = {
      id: user.id,
      email: user.email ?? "",
      name: user.user_metadata?.name ?? user.email ?? "",
      role: role as CMSUser["role"],
      createdAt: user.created_at,
    };

    return {
      user: cmsUser,
      isAuthenticated: true,
      isAdmin: cmsUser.role === "admin",
      isEditor: true, // all roles can edit content
      isMediaManager: cmsUser.role === "admin" || cmsUser.role === "media_manager",
      isReleaseManager: cmsUser.role === "admin" || cmsUser.role === "release_manager",
    };
  } catch {
    return { user: null, isAuthenticated: false, isAdmin: false, isEditor: false, isMediaManager: false, isReleaseManager: false };
  }
}

export async function requireAuth(): Promise<CMSUser> {
  const session = await getSession();
  if (!session.isAuthenticated || !session.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function requireAdmin(): Promise<CMSUser> {
  const user = await requireAuth();
  if (user.role !== "admin") throw new Error("Forbidden");
  return user;
}

export function getLoginUrl(): string {
  return "/login";
}

export function getAdminUrl(): string {
  return "/admin";
}

/**
 * Resolves the current authenticated user's upload identity.
 * Returns the user's email address when available, falling back to the user ID,
 * and finally to "unknown" when Supabase is not configured or the session has lapsed.
 *
 * Call this client-side immediately before calling uploadAsset() so that the
 * returned uploadedBy string is written to the asset record as the true actor.
 */
export async function getCurrentUploader(): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl?.startsWith("https://")) {
    // Local dev / seed mode — no real auth session.
    return "dev";
  }
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    return user?.email ?? user?.id ?? "unknown";
  } catch {
    return "unknown";
  }
}

