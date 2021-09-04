/* eslint-disable @typescript-eslint/no-var-requires */
const withTM = require('next-transpile-modules')(['@tldraw/tldraw'])

module.exports = withTM({
  reactStrictMode: true,
})
