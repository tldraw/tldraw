/* eslint-disable @typescript-eslint/no-var-requires */
const withPWA = require('next-pwa')
const withTM = require('next-transpile-modules')(['@tldraw/tldraw', '@tldraw/core'])
const { withSentryConfig } = require('@sentry/nextjs')
const { GITHUB_ID, GITHUB_SECRET, GITHUB_API_SECRET, NODE_ENV, GA_MEASUREMENT_ID } = process.env

const moduleExports = {
  reactStrictMode: true,
  pwa: {
    disable: NODE_ENV !== 'production',
    dest: 'public',
  },
  env: {
    GA_MEASUREMENT_ID,
    GITHUB_ID,
    GITHUB_SECRET,
    GITHUB_API_SECRET,
  },
}

const sentryWebpackPluginOptions = {
  silent: true,
}

// Make sure adding Sentry options is the last code to run before exporting, to
// ensure that your source maps include changes from all other Webpack plugins
module.exports = module.exports = withSentryConfig(
  withPWA(withTM(moduleExports)),
  sentryWebpackPluginOptions
)
