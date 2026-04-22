import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "i.scdn.co",
        // Spotify CDN — pre-authorized for future next/image adoption.
        // Current Spotify components use plain <img> with eslint-disable comments;
        // this entry is in place so migrating to next/image requires no config change.
        // Spotify CDN — artist/album artwork served from this hostname
        protocol: "https",
        hostname: "i.scdn.co",
        pathname: "/image/**",
      },
    ],
  },
};

export default nextConfig;
