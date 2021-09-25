/* eslint-disable @typescript-eslint/no-var-requires */
const withPWA = require('next-pwa')
const SentryWebpackPlugin = require('@sentry/webpack-plugin')
const withTM = require('next-transpile-modules')(['@tldraw/tldraw'])

const {
  GITHUB_ID,
  GITHUB_SECRET,
  GITHUB_API_SECRET,
  NEXT_PUBLIC_SENTRY_DSN: SENTRY_DSN,
  SENTRY_ORG,
  SENTRY_PROJECT,
  SENTRY_AUTH_TOKEN,
  NODE_ENV,
  VERCEL_GIT_COMMIT_SHA,
  GA_MEASUREMENT_ID,
} = process.env

process.env.SENTRY_DSN = SENTRY_DSN

const isProduction = NODE_ENV === 'production'

const basePath = ''

module.exports = withTM(
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
      GITHUB_SECRET,
      GITHUB_API_SECRET,
    },
    webpack: (config, options) => {
      if (!options.isServer) {
        config.resolve.alias['@sentry/node'] = '@sentry/browser'
      }

      config.plugins.push(
        new options.webpack.DefinePlugin({
          'process.env.NEXT_IS_SERVER': JSON.stringify(options.isServer.toString()),
        })
      )

      if (
        SENTRY_DSN &&
        SENTRY_ORG &&
        SENTRY_PROJECT &&
        SENTRY_AUTH_TOKEN &&
        VERCEL_GIT_COMMIT_SHA &&
        isProduction
      ) {
        config.plugins.push(
          new SentryWebpackPlugin({
            include: '.next',
            ignore: ['node_modules'],
            stripPrefix: ['webpack://_N_E/'],
            urlPrefix: `~${basePath}/_next`,
            release: VERCEL_GIT_COMMIT_SHA,
            authToken: SENTRY_AUTH_TOKEN,
            org: SENTRY_PROJECT,
            project: SENTRY_ORG,
          })
        )
      }
      return config
    },
  })
)
