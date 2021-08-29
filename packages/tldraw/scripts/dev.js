/* eslint-disable */
const fs = require('fs')
const esbuild = require('esbuild')

const name = process.env.npm_package_name || ''

async function main() {
  if (!fs.existsSync('./dist')) {
    fs.mkdirSync('./dist')
  }

  esbuild.build({
    entryPoints: ['./src/index.ts'],
    outdir: 'dist/cjs',
    minify: false,
    bundle: true,
    format: 'cjs',
    target: 'es6',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    tsconfig: './tsconfig.build.json',
    external: ['react', 'react-dom'],
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

  // result.stop();
}

main()
