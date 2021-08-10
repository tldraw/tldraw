# react-esbuild-starter

Starter template for React and Typescript.
Inspired by https://github.com/sikanhe/rescript-esbuild-starter

It provides minimal yet 🔥 blazing fast ™ development boilerplate for rapid React prototyping.

- `yarn start` Starts typescript typechecking and esbuild in watch mode, and serves web page at localhost:5000.
- `yarn build` Builds production bundle for browser, outputs bundle to dist/bundle.js with source map.
- `yarn clean` Clean up assets produced by esbuild.

All code bundling and transpilation is handled by esbuild. Its configuration is kept inside `esbuild.config.mjs`. Follow [esbuild docs](https://esbuild.github.io/getting-started/) to see all supported options.

### Caveats

- No output file hashing
- No test runner
- Importing CSS in JS file is not supported in esbuild yet. It is currently in development https://github.com/evanw/esbuild/issues/20. In meantime either opt-in for some CSS-in-JS solution, or include styles directly in `www/index.html`.
