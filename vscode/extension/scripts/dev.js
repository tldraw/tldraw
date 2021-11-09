/* eslint-disable */
const fs = require('fs')
const esbuild = require('esbuild')
const { gzip } = require('zlib')
const pkg = require('../package.json')

async function main() {
  if (fs.existsSync('./dist')) {
    fs.rmSync('./dist', { recursive: true }, (e) => {
      if (e) {
        throw e
      }
    })
  }

  try {
    const esmResult = esbuild.buildSync({
      entryPoints: ['./src/extension.ts'],
      outdir: 'dist/web',
      minify: true,
      bundle: true,
      format: 'cjs',
      target: 'es6',
      define: {
        'process.env.NODE_ENV': '"development"',
      },
      tsconfig: './tsconfig.json',
      external: Object.keys(pkg.dependencies)
        .concat(Object.keys(pkg.peerDependencies))
        .concat(['vscode']),
      metafile: true,
    })

    let esmSize = 0
    Object.values(esmResult.metafile.outputs).forEach((output) => {
      esmSize += output.bytes
    })

    fs.readFile('./dist/web/index.js', (_err, data) => {
      gzip(data, (_err, result) => {
        console.log(
          `✔ ${pkg.name}: Built pkg. ${(esmSize / 1000).toFixed(2)}kb (${(
            result.length / 1000
          ).toFixed(2)}kb minified)`
        )
      })
    })
  } catch (e) {
    console.log(`× ${pkg.name}: Build failed due to an error.`)
    console.log(e)
  }
}

main()
