/* eslint-disable @typescript-eslint/no-var-requires */
const withTM = require('next-transpile-modules')(['@tldraw/tldraw'])

const { NODE_ENV } = process.env

const isProduction = NODE_ENV === 'production'

module.exports = withTM({
  reactStrictMode: true,
  pwa: {
    disable: !isProduction,
    dest: 'public',
  },
})
