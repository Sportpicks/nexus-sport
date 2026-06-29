import type { NextConfig } from "next";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  disable: false,
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  // next-pwa wraps the config below
};

export default withPWA(nextConfig);
