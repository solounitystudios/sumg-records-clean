import { NextRequest, NextResponse } from "next/server";
import { searchSpotify } from "@/lib/spotify";

/**
 * GET /api/spotify/search
 *
 * Query params:
 *   q      — search query (required)
 *   types  — comma-separated: artist, album, track  (default: artist)
 *   limit  — max results per type, 1–50             (default: 10)
 *
 * Calls Spotify server-side so credentials are never exposed to the browser.
 *
 * Rate limit: 20 requests per 60-second window per IP.  This is an in-memory
 * sliding window — it resets when the server process restarts.  Sufficient for
 * an internal admin tool; add Redis-backed rate limiting if this route is ever
 * exposed publicly at scale.
 */

// ─── Simple per-IP rate limiter ───────────────────────────────────────────────

const RATE_LIMIT_MAX = 20;        // requests allowed per window
const RATE_LIMIT_WINDOW_MS = 60_000; // 60-second window

interface RateEntry {
  count: number;
  windowStart: number;
}

// Module-level map — intentionally not shared across Node.js processes.
// Cleared on each cold start / serverless instance lifecycle.
const _rateLimitMap = new Map<string, RateEntry>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = _rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    _rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true; // allowed
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false; // blocked
  }

  entry.count += 1;
  return true; // allowed
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests — please wait before searching again" },
      {
        status: 429,
        headers: { "Retry-After": "60" },
      }
    );
  }

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json(
      { error: "Missing required query parameter: q" },
      { status: 400 }
    );
  }

  const rawTypes = searchParams.get("types") ?? "artist";
  const typeList = rawTypes
    .split(",")
    .map((t: string) => t.trim())
    .filter((t: string): t is "artist" | "album" | "track" =>
      ["artist", "album", "track"].includes(t)
    );

  if (typeList.length === 0) {
    return NextResponse.json(
      { error: "Invalid type parameter — use: artist, album, track" },
      { status: 400 }
    );
  }

  const limit = Math.min(Math.max(1, Number(searchParams.get("limit") ?? 10)), 50);

  const results = await searchSpotify(q, typeList, limit);

  return NextResponse.json(results, {
    headers: {
      "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
    },
  });
}
