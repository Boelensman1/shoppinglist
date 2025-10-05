import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

// You may want to use a more robust revision to cache
// files more efficiently.
// A viable option is `git rev-parse HEAD`.
const revision = crypto.randomUUID()

const isProd = process.env.NODE_ENV === 'production'

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  additionalPrecacheEntries: [{ url: '/~offline', revision }],
})

const nextConfig: NextConfig = {
  distDir: 'build',
  output: isProd ? 'standalone' : undefined,
}

export default withSerwist(nextConfig)
