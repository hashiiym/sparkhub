import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@clerk/nextjs", "@clerk/shared", "@clerk/backend", "@clerk/clerk-react"],
};

export default nextConfig;
