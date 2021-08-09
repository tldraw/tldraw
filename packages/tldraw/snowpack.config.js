/** @type {import('snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {},
  plugins: ['@snowpack/plugin-react-refresh', '@snowpack/plugin-typescript'],
  routes: [],
  optimize: {},
  packageOptions: {
    external: ['react', 'react-dom'],
  },
  devOptions: {},
  buildOptions: {},
  alias: {
    '@tldraw/core': '../core',
  },
}
