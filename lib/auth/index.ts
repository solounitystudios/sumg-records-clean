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
      return { user: null, isAuthenticated: false, isAdmin: false, isEditor: false };
    }

    // Role is stored in user_metadata.role or app_metadata.role
    const role =
      (user.app_metadata?.role as string | undefined) ??
      (user.user_metadata?.role as string | undefined) ??
      "editor";

    const cmsUser: CMSUser = {
      id: user.id,
      email: user.email ?? "",
      name: user.user_metadata?.name ?? user.email ?? "",
      role: role === "admin" ? "admin" : "editor",
      createdAt: user.created_at,
    };

    return {
      user: cmsUser,
      isAuthenticated: true,
      isAdmin: cmsUser.role === "admin",
      isEditor: cmsUser.role === "editor" || cmsUser.role === "admin",
    };
  } catch {
    return { user: null, isAuthenticated: false, isAdmin: false, isEditor: false };
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

