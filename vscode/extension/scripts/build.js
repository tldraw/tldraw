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

  try {
    esbuild.buildSync({
      entryPoints: ['./src/extension.ts'],
      outdir: 'dist/web',
      minify: false,
      bundle: true,
      format: 'cjs',
      target: 'es6',
      define: {
        'process.env.NODE_ENV': '"development"',
      },
      tsconfig: './tsconfig.json',
      external: ['vscode'],
    })
    console.log(`Built package.`)
  } catch (e) {
    console.log(`× Build failed due to an error.`)
    console.log(e)
  }
}

main()
