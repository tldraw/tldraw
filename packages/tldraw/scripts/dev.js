/* eslint-disable */
const esbuild = require('esbuild')
const pkg = require('../package.json')

const { log: jslog } = console

async function main() {
  esbuild.build({
    entryPoints: ['./src/index.ts'],
    outdir: 'dist/esm',
    minify: false,
    bundle: true,
    format: 'esm',
    target: 'es6',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    tsconfig: './tsconfig.build.json',
    external: Object.keys(pkg.dependencies).concat(Object.keys(pkg.peerDependencies)),
    sourcemap: true,
    incremental: true,
    watch: {
      onRebuild(error) {
        if (error) {
          jslog(`× ${pkg.name}: An error in prevented the rebuild.`)
          return
        }
        jslog(`✔ ${pkg.name}: Rebuilt.`)
      },
    },
  })
}

main()
