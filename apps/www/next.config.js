const withPWA = require('next-pwa')
const withTM = require('next-transpile-modules')

const { GITHUB_ID, GITHUB_API_SECRET, NODE_ENV, VERCEL_GIT_COMMIT_SHA, GA_MEASUREMENT_ID } =
  process.env

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
  })
)
