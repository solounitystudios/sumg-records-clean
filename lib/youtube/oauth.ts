import "server-only"
import { supabase } from "@/lib/db/supabase"

const CLIENT_ID     = process.env.YOUTUBE_CLIENT_ID     ?? ""
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET ?? ""
const REDIRECT_URI  = process.env.YOUTUBE_REDIRECT_URI  ?? ""

export function isOAuthConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI)
}

export function getMissingOAuthConfig(): string[] {
  const missing: string[] = []
  if (!CLIENT_ID)     missing.push("YOUTUBE_CLIENT_ID")
  if (!CLIENT_SECRET) missing.push("YOUTUBE_CLIENT_SECRET")
  if (!REDIRECT_URI)  missing.push("YOUTUBE_REDIRECT_URI")
  return missing
}

export function buildAuthUrl(channelDbId: string): string {
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: "code",
    scope:         "https://www.googleapis.com/auth/youtube.upload",
    access_type:   "offline",
    prompt:        "consent",
    state:         channelDbId,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

interface TokenResponse {
  access_token:   string
  refresh_token?: string
  expires_in:     number
  scope:          string
  token_type:     string
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
      grant_type:    "authorization_code",
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OAuth code exchange failed (${res.status}): ${body}`)
  }
  return res.json() as Promise<TokenResponse>
}

async function refreshToken(refreshTok: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshTok,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type:    "refresh_token",
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Token refresh failed (${res.status}): ${body}`)
  }
  return res.json()
}

/** Returns a valid access token for the channel, refreshing if expired or within 60s of expiry. */
export async function getValidToken(channelDbId: string): Promise<string> {
  const { data, error } = await supabase
    .from("yt_channels")
    .select("oauth_access_token, oauth_refresh_token, oauth_token_expiry")
    .eq("id", channelDbId)
    .single()

  if (error || !data) throw new Error(`Channel not found: ${channelDbId}`)

  const tok    = data as { oauth_access_token: string | null; oauth_refresh_token: string | null; oauth_token_expiry: string | null }
  if (!tok.oauth_refresh_token) throw new Error("OAuth not connected — no refresh token stored for this channel")

  const expiry     = tok.oauth_token_expiry ? new Date(tok.oauth_token_expiry) : null
  const needRefresh = !tok.oauth_access_token || !expiry || expiry <= new Date(Date.now() + 60_000)

  if (!needRefresh) return tok.oauth_access_token!

  const refreshed = await refreshToken(tok.oauth_refresh_token)
  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1_000).toISOString()

  await supabase
    .from("yt_channels")
    .update({ oauth_access_token: refreshed.access_token, oauth_token_expiry: newExpiry, updated_at: new Date().toISOString() })
    .eq("id", channelDbId)

  return refreshed.access_token
}
