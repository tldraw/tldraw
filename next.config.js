const withPWA = require('next-pwa')
const SentryWebpackPlugin = require('@sentry/webpack-plugin')

const {
  NEXT_PUBLIC_SENTRY_DSN: SENTRY_DSN,
  SENTRY_ORG,
  SENTRY_PROJECT,
  SENTRY_AUTH_TOKEN,
  NODE_ENV,
  VERCEL_GIT_COMMIT_SHA,
  SUPABASE_KEY,
  SUPABASE_URL,
  GA_MEASUREMENT_ID,
} = process.env

process.env.SENTRY_DSN = SENTRY_DSN

const basePath = ''

module.exports = withPWA({
  future: {
    webpack5: true,
  },
  pwa: {
    dest: 'public',
    scope: '/',
    disable: process.env.NODE_ENV === 'development',
  },

  productionBrowserSourceMaps: true,
  env: {
    NEXT_PUBLIC_COMMIT_SHA: VERCEL_GIT_COMMIT_SHA,
    SUPABASE_KEY: SUPABASE_KEY,
    SUPABASE_URL: SUPABASE_URL,
    GA_MEASUREMENT_ID: GA_MEASUREMENT_ID,
  },
  webpack: (config, options) => {
    if (!options.isServer) {
      config.resolve.alias['@sentry/node'] = '@sentry/browser'
    }

    config.plugins.push(
      new options.webpack.DefinePlugin({
        'process.env.NEXT_IS_SERVER': JSON.stringify(
          options.isServer.toString()
        ),
      })
    )

    if (
      SENTRY_DSN &&
      SENTRY_ORG &&
      SENTRY_PROJECT &&
      SENTRY_AUTH_TOKEN &&
      VERCEL_GIT_COMMIT_SHA &&
      NODE_ENV === 'production'
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
  basePath,
})
