const withTM = require('next-transpile-modules')(['@tldraw/tldraw'])

module.exports = withTM({
  reactStrictMode: true,
  webpack5: true,
  symlinks: false,
})
