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
    esbuild.buildSync({
      entryPoints: ['./src/index.ts'],
      outdir: 'dist/cjs',
      minify: false,
      bundle: true,
      format: 'cjs',
      target: 'es6',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      tsconfig: './tsconfig.build.json',
      external: Object.keys(pkg.dependencies).concat(Object.keys(pkg.peerDependencies)),
      metafile: true,
      sourcemap: true,
    })

    const esmResult = esbuild.buildSync({
      entryPoints: ['./src/index.ts'],
      outdir: 'dist/esm',
      minify: false,
      bundle: true,
      format: 'esm',
      target: 'es6',
      tsconfig: './tsconfig.build.json',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      external: Object.keys(pkg.dependencies).concat(Object.keys(pkg.peerDependencies)),
      metafile: true,
      sourcemap: true,
    })

    let esmSize = 0
    Object.values(esmResult.metafile.outputs).forEach((output) => {
      esmSize += output.bytes
    })

    fs.readFile('./dist/esm/index.js', (_err, data) => {
      gzip(data, (_err, result) => {
        console.log(
          `✔ ${pkg.name}: Built package. ${(esmSize / 1000).toFixed(2)}kb (${(
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
