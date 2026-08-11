import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 DevTools indicator drag uses releasePointerCapture without
  // guarding lost pointers; that throws NotFoundError in the browser console
  // (stack: next-devtools chunk only). Hide the indicator; error overlays remain.
  devIndicators: false,
  transpilePackages: [
    "@stepdone/database",
    "@stepdone/auth",
    "@stepdone/schemas",
    "@stepdone/domain",
    "@stepdone/project-engine",
    "@stepdone/payments",
    "@stepdone/config",
    "@stepdone/agent-core",
  ],
  serverExternalPackages: ["@prisma/client", "ioredis"],
};

export default nextConfig;
