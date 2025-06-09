/** @type {import('next').NextConfig} */

const nextConfig = {
  // Configure API routes
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
    // Configure body size limits for App Router
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  // Configure body size limits for API routes (Pages Router)
  api: {
    bodyParser: {
      sizeLimit: "100mb",
    },
    responseLimit: "100mb",
  },
  // Configure server request size limits
  serverRuntimeConfig: {
    maxRequestSize: "100mb",
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
  // Disable static optimization
  output: "standalone",
  // Configure dynamic routes
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, must-revalidate",
          },
        ],
      },
    ];
  },
  // Disable static generation for dynamic routes
  async generateStaticParams() {
    return [];
  },
  // Mark all pages as dynamic
  staticPageGenerationTimeout: 0,
  // Disable static optimization
  staticPageGenerationTimeout: 0,
  // Configure dynamic routes
  async rewrites() {
    return [];
  },
};

if (process.env.NEXT_PUBLIC_TEMPO) {
  nextConfig["experimental"] = {
    ...nextConfig.experimental,
    // NextJS 14.1.3 to 14.2.11:
    swcPlugins: [[require.resolve("tempo-devtools/swc/0.90"), {}]],
  };
}

module.exports = nextConfig;
