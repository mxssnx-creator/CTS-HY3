// Force rebuild: 2026-04-10T13:07:30
const nextConfig = {
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
    turbo: {
      resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
    },
  },
  webpack: (config, { isServer, dev }) => {
    if (dev && !isServer) {
      config.cache = {
        type: 'memory',
        maxGenerations: 5,
      }
    }
    if (!isServer) {
      config.resolve = config.resolve || {}
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        crypto: false,
        stream: false,
        buffer: false,
        fs: false,
        path: false,
      }
    }
    return config
  },
  // Optimize for development performance
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 5,
  },
}

export default nextConfig
