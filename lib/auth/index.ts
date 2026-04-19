import { AuthSession, CMSUser } from "@/lib/types";

// Placeholder — wire to Supabase/NextAuth in Phase 2
export async function getSession(): Promise<AuthSession> {
  return { user: null, isAuthenticated: false, isAdmin: false, isEditor: false };
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
