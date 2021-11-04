/* eslint-disable */
const fs = require('fs')
const esbuild = require('esbuild')

async function main() {
  if (fs.existsSync('./dist')) {
    fs.rmSync('./dist', { recursive: true }, (e) => {
      if (e) {
        throw e
      }
    })
  }

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
  })
}

main()
