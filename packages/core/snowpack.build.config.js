/** @type {import('snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {},
  plugins: ['@snowpack/plugin-react-refresh', '@snowpack/plugin-typescript'],
  routes: [],
  optimize: {
    minify: true,
    target: 'es2018',
    sourcemap: 'external',
    splitting: true,
    treeshake: true,
    manifest: true,
  },
  packageOptions: {
    external: ['react', 'react-dom'],
  },
  devOptions: {},
  buildOptions: {},
  alias: {},
}
