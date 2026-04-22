export type Role = "admin" | "artist"

export interface SessionPayload {
  role: Role
  sub: string
  exp: number
}

export const SESSION_COOKIE = "sumg-session"
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET environment variable must be set in production")
    }
    return "sumg_dev_insecure_secret_replace_before_production"
  }
  return secret
}

function encode(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer as ArrayBuffer
}

function decode(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf)
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  )
}

function toBase64Url(buf: ArrayBuffer): string {
  let binary = ""
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

function fromBase64Url(str: string): ArrayBuffer {
  const padded =
    str.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (str.length % 4)) % 4)
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)).buffer as ArrayBuffer
}

export async function encodeSession(role: Role, sub: string): Promise<string> {
  const payload: SessionPayload = {
    role,
    sub,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  }
  const key = await importKey(getSecret())
  const payloadB64 = toBase64Url(encode(JSON.stringify(payload)))
  const sig = await crypto.subtle.sign("HMAC", key, encode(payloadB64))
  return `${payloadB64}.${toBase64Url(sig)}`
}

export async function decodeSession(token: string): Promise<SessionPayload | null> {
  const dot = token.indexOf(".")
  if (dot === -1) return null
  const payloadB64 = token.slice(0, dot)
  const sigB64 = token.slice(dot + 1)

  try {
    const key = await importKey(getSecret())
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(sigB64),
      encode(payloadB64),
    )
    if (!valid) return null

    const payload = JSON.parse(decode(fromBase64Url(payloadB64))) as SessionPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}
