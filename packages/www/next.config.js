const withTM = require('next-transpile-modules')(['@tldraw/tldraw'], { resolveSymlinks: true })

module.exports = withTM({
  reactStrictMode: true,
  webpack5: true,
})
