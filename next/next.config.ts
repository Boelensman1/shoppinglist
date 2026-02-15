import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

const isProd = process.env.NODE_ENV === 'production'
const swDisabled = process.env.NEXT_PUBLIC_DISABLE_SW === '1'

const withSerwist = withSerwistInit({
  cacheOnNavigation: true,
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: swDisabled,
})

const nextConfig: NextConfig = {
  distDir: 'build',
  output: isProd ? 'standalone' : undefined,
  allowedDevOrigins: ['localhost', '127.0.0.1'],
}

export default withSerwist(nextConfig)
