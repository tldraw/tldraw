/* eslint-disable */
const fs = require('fs')
const esbuild = require('esbuild')

const { log: jslog } = console

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
      entryPoints: ['./src/extension.ts'],
      outdir: 'dist/web',
      minify: false,
      bundle: true,
      format: 'cjs',
      target: 'es6',
      platform: 'node',
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      tsconfig: './tsconfig.json',
      external: ['vscode'],
    })
    jslog(`Built package.`)
  } catch (e) {
    jslog(`× Build failed due to an error.`)
    jslog(e)
  }
}

main()
