const withPWA = require('next-pwa')
const { withSentryConfig } = require('@sentry/nextjs')

const SentryWebpackPluginOptions = {
  // Additional config options for the Sentry Webpack plugin. Keep in mind that
  // the following options are set automatically, and overriding them is not
  // recommended:
  //   release, url, org, project, authToken, configFile, stripPrefix,
  //   urlPrefix, include, ignore
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options.
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
