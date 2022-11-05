const withPWA = require('next-pwa')
const withTM = require('next-transpile-modules')
const PalettePlugin = require('@palette.dev/webpack-plugin')

const {
  GITHUB_ID,
  GITHUB_API_SECRET,
  NODE_ENV,
  VERCEL_GIT_COMMIT_SHA,
  GA_MEASUREMENT_ID,
  PALETTE_ASSET_KEY,
} = process.env

const isProduction = NODE_ENV === 'production'

module.exports = withTM(['@tldraw/tldraw', '@tldraw/core'])(
  withPWA({
    reactStrictMode: true,
    pwa: {
      disable: !isProduction,
      dest: 'public',
    },
    productionBrowserSourceMaps: true,
    env: {
      NEXT_PUBLIC_COMMIT_SHA: VERCEL_GIT_COMMIT_SHA,
      GA_MEASUREMENT_ID,
      GITHUB_ID,
      GITHUB_API_SECRET,
    },
    webpack(config) {
      config.plugins.push(
        new PalettePlugin({
          key: process.env.PALETTE_ASSET_KEY,
          include: ['.next/static'],
          version: VERCEL_GIT_COMMIT_SHA,
        })
      )
      return config
    },
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Document-Policy',
              value: 'js-profiling',
            },
          ],
        },
      ]
    },
  })
)
