/* eslint-disable @typescript-eslint/no-var-requires */
const { withSentryConfig } = require('@sentry/nextjs')
const withPWA = require('next-pwa')
const withTM = require('next-transpile-modules')(['@tldraw/tldraw', '@tldraw/core'])

const sentryWebpackPluginOptions = {
  silent: true, // Suppresses all logs
}

const {
  GITHUB_ID,
  GITHUB_SECRET,
  GITHUB_API_SECRET,
  NODE_ENV,
  VERCEL_GIT_COMMIT_SHA,
  GA_MEASUREMENT_ID,
} = process.env

const isProduction = NODE_ENV === 'production'

module.exports = withSentryConfig(
  withPWA(
    withTM({
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
        GITHUB_SECRET,
        GITHUB_API_SECRET,
      },
    })
  ),
  sentryWebpackPluginOptions
)
