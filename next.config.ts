import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Spotify CDN — pre-authorised for future next/image adoption.
        // Current Spotify components use plain <img> with eslint-disable comments;
        // this entry is in place so migrating to next/image requires no config change.
        protocol: "https",
        hostname: "i.scdn.co",
        pathname: "/image/**",
      },
    ],
  },
};

export default nextConfig;
