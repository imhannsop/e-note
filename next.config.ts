import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let phones on the home network use the dev server (dev only; no effect in production)
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
