/* eslint-disable */
const esbuild = require('esbuild')

const name = process.env.npm_package_name || ''

async function main() {
  esbuild.build({
    entryPoints: ['./src/index.ts'],
    outdir: 'dist/cjs',
    minify: false,
    bundle: true,
    format: 'cjs',
    target: 'es6',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    tsconfig: './tsconfig.json',
    external: ['react', 'react-dom'],
    incremental: true,
    watch: {
      onRebuild(error) {
        if (error) {
          console.log(`× ${name}: An error in prevented the rebuild.`)
          return
        }
        console.log(`✔ ${name}: Rebuilt.`)
      },
    },
  })
}

main()
