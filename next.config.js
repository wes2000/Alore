/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disabled to prevent double RAF in dev
  transpilePackages: ['three'],
  webpack: (config) => {
    config.externals = config.externals || []
    return config
  },
}

module.exports = nextConfig
