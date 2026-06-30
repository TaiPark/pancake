import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "http", hostname: "minio", port: "9000" }
    ]
  }
};

export default nextConfig;
