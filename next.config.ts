import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local dev host access.
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
