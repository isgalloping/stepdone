import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
