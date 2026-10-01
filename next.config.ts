import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
