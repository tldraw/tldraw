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
    outdir: 'dist/cjs',
    minify: false,
    bundle: true,
    format: 'cjs',
    target: 'es6',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    tsconfig: './tsconfig.build.json',
    external: ['react', 'react-dom'],
  })
}

main()
