const withPWA = require('next-pwa')
const { withSentryConfig } = require('@sentry/nextjs')

const SentryWebpackPluginOptions = {
  silent: process.env.NODE_ENV === 'development',
}

module.exports = withSentryConfig(
  withPWA({
    future: {
      webpack5: true,
    },
    pwa: {
      dest: 'public',
      scope: '/',
      disable: process.env.NODE_ENV === 'development',
    },
  }),
  SentryWebpackPluginOptions
)
