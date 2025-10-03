/** @type {import('next').NextConfig} */

const nextConfig = {
  // Configure API routes
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
  },

  images: {
    domains: ["storage.googleapis.com"],
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
};



module.exports = nextConfig;
