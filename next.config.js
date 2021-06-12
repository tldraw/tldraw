const withPWA = require('next-pwa')

module.exports = withPWA({
  future: {
    webpack5: true,
  },
  pwa: {
    dest: 'public',
    scope: '/',
    disable: process.env.NODE_ENV === 'development',
  },
})
