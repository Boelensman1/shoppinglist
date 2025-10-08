import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

const isProd = process.env.NODE_ENV === 'production'

const withSerwist = withSerwistInit({
  cacheOnNavigation: true,
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV !== 'production',
})

const nextConfig: NextConfig = {
  distDir: 'build',
  output: isProd ? 'standalone' : undefined,
}

export default withSerwist(nextConfig)
