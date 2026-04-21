import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking — disallow all iframe embedding
          { key: "X-Frame-Options", value: "DENY" },
          // Block MIME-type sniffing on served assets
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Only send origin in Referer header on same-site; strip on cross-origin
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Force HTTPS for one year once the site is fully TLS-only
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Content Security Policy.
          // 'unsafe-inline' is required by Tailwind CSS v4 (injected styles) and
          // Next.js App Router (hydration inline scripts).
          // 'unsafe-eval' is only included in development (Next.js HMR/Turbopack).
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'unsafe-eval' is needed by Next.js dev server (HMR); omit in production
              isDev
                ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
                : "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              // Supabase storage for uploaded media; i.scdn.co for Spotify album art
              "img-src 'self' data: blob: https://*.supabase.co https://i.scdn.co",
              // Supabase REST/Auth/Realtime API calls from the browser
              "connect-src 'self' https://*.supabase.co",
              "font-src 'self' data:",
              // Audio/video files served from Supabase storage
              "media-src 'self' blob: https://*.supabase.co",
              "object-src 'none'",
              "base-uri 'self'",
              // Disallow framing (CSP-level, complements X-Frame-Options for modern browsers)
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
