import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  // The dev server is reached over the LAN / virtual adapter address as well as
  // localhost; without this Next.js blocks its own dev chunks and HMR.
  allowedDevOrigins: ["192.168.211.1"],
};

// Mounts the eve agent in `agent/` alongside the Next.js app, so one dev
// server and one deploy serve both. Routes land on /eve/v1/*.
export default withEve(nextConfig);
