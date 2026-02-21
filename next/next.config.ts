import type { NextConfig } from 'next'
import { spawnSync } from 'node:child_process'
import withSerwistInit from '@serwist/next'

const isProd = process.env.NODE_ENV === 'production'
const swDisabled = process.env.NEXT_PUBLIC_DISABLE_SW === '1'

const revision = swDisabled
  ? ''
  : spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout

const withSerwist = withSerwistInit({
  additionalPrecacheEntries: [{ url: '/~offline', revision }],
  cacheOnNavigation: true,
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: swDisabled,
})

const nextConfig: NextConfig = {
  distDir: 'build',
  output: isProd ? 'standalone' : undefined,
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  transpilePackages: ['@shoppinglist/shared', 'server'],
}

export default withSerwist(nextConfig)
