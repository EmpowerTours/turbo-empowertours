import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    const hlsTemplates = [
      'digital-data-stream',
      'digital-glass-morph',
      'digital-wire-mesh',
      'digital-holo-wave',
      'digital-pulse-ring',
    ];
    return hlsTemplates.map((t) => ({
      source: `/hls/templates/${t}/:path*`,
      destination: `http://18.190.218.92:8001/hls/templates/${t}/:path*`,
    }));
  },
};

export default nextConfig;
