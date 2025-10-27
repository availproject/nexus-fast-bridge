import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  },
};

export default nextConfig;
