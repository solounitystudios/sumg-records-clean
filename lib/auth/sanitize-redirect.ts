/**
 * Returns the redirect path only when it is a safe internal relative URL.
 * Rejects anything that is not a path-absolute URL (i.e. starts with "/")
 * or that starts with "//" (protocol-relative external URL).
 *
 * Used in both /login (client) and /auth/callback (server route) so the
 * same rule is enforced at both entry points.
 */
export function sanitizeRedirect(
  redirect: string | null | undefined,
  fallback = "/admin"
): string {
  if (
    redirect &&
    redirect.startsWith("/") &&
    !redirect.startsWith("//")
  ) {
    return redirect;
  }
  return fallback;
}
