/**
 * lib/auth/sanitize-redirect.ts
 *
 * Shared open-redirect guard used by both the login page and the
 * auth callback route.  Any value that is not a safe same-origin
 * path (starts with "/" but not "//") is replaced with `fallback`.
 *
 * Examples:
 *   sanitizeRedirect("/admin/releases") → "/admin/releases"  ✅
 *   sanitizeRedirect("https://evil.com") → "/admin"          🛡
 *   sanitizeRedirect("//evil.com")       → "/admin"          🛡
 *   sanitizeRedirect(null)               → "/admin"          🛡
 */
export function sanitizeRedirect(
  value: string | null | undefined,
  fallback = "/admin"
): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  return value;
}
