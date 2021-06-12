const withPWA = require('next-pwa')

module.exports = withPWA({
  pwa: {
    dest: 'public',
    scope: '/',
    disable: process.env.NODE_ENV === 'development',
  },
})
