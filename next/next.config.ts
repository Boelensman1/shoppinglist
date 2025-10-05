import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  distDir: 'build',
  output: isProd ? 'standalone' : undefined,
  basePath: process.env.NODE_ENV === 'production' ? '/shoppinglist' : '',
}

export default nextConfig
