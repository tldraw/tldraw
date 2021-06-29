/* eslint-disable @typescript-eslint/no-var-requires */
const withPWA = require('next-pwa')

const isProduction = process.env.NODE_ENV === 'production'

module.exports = withPWA({
  pwa: {
    disable: !isProduction,
    dest: 'public',
  },
})
