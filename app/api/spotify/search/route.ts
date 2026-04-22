import { NextRequest, NextResponse } from "next/server";
import { searchSpotify } from "@/lib/spotify";

// ─── Simple per-IP rate limiter ───────────────────────────────────────────────

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

interface RateEntry {
  count: number;
  windowStart: number;
}

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
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests — please wait before searching again" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ error: "Missing required query parameter: q" }, { status: 400 });
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
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
  });
}
