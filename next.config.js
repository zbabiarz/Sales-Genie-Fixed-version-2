/** @type {import('next').NextConfig} */

const nextConfig = {
  // Configure API routes
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
  },
  api: {
    bodyParser: {
      sizeLimit: "100mb",
    },
    responseLimit: "100mb",
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
