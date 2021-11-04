/* eslint-disable */
const fs = require('fs')
const esbuild = require('esbuild')
const { gzip } = require('zlib')

const name = process.env.npm_package_name || ''

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
      minify: true,
      bundle: true,
      format: 'cjs',
      target: 'es6',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      tsconfig: './tsconfig.json',
      external: [
        'react',
        'react-dom',
        'tslib',
        '@stitches/react',
        '@radix-ui/react-alert-dialog',
        '@radix-ui/react-checkbox',
        '@radix-ui/react-context-menu',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-icons',
        '@radix-ui/react-id',
        '@radix-ui/react-radio',
        '@radix-ui/react-tooltip',
        'perfect-freehand',
        'rko',
        'react-hotkeys-hook',
      ],
      metafile: true,
    })

    const esmResult = esbuild.buildSync({
      entryPoints: ['./src/index.ts'],
      outdir: 'dist/esm',
      minify: true,
      bundle: true,
      format: 'esm',
      target: 'es6',
      tsconfig: './tsconfig.build.json',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      external: [
        'react',
        'react-dom',
        'tslib',
        '@stitches/react',
        '@radix-ui/react-alert-dialog',
        '@radix-ui/react-checkbox',
        '@radix-ui/react-context-menu',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-icons',
        '@radix-ui/react-id',
        '@radix-ui/react-radio',
        '@radix-ui/react-tooltip',
        '@tldraw/core',
        '@tldraw/vec',
        '@tldraw/intersect',
        'perfect-freehand',
        'rko',
        'react-hotkeys-hook',
      ],
      metafile: true,
    })

    let esmSize = 0
    Object.values(esmResult.metafile.outputs).forEach((output) => {
      esmSize += output.bytes
    })

    fs.readFile('./dist/esm/index.js', (_err, data) => {
      gzip(data, (_err, result) => {
        console.log(
          `✔ ${name}: Built package. ${(esmSize / 1000).toFixed(2)}kb (${(
            result.length / 1000
          ).toFixed(2)}kb minified)`
        )
      })
    })
  } catch (e) {
    console.log(`× ${name}: Build failed due to an error.`)
    console.log(e)
  }
}

main()
