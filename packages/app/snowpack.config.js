/** @type {import('snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    public: '/',
    src: '/',
    '../core': '/@tldraw/core',
    '../tldraw': '/@tldraw/tldraw',
  },
  plugins: ['@snowpack/plugin-react-refresh', '@snowpack/plugin-typescript'],
  routes: [],
  optimize: {},
  packageOptions: {},
  devOptions: {},
  buildOptions: {},
  alias: {
    '@tldraw/core': '../core',
    '@tldraw/tldraw': '../tldraw',
  },
}
