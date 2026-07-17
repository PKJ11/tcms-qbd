/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Lint runs in dev/CI, not as a gate on production builds.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
