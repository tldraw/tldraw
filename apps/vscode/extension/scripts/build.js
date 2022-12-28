/* eslint-disable */
const fs = require('fs')
const pkg = require('../package.json')
const esbuild = require('esbuild')
const { exec } = require('child_process')

const { log: jslog } = console

async function copyEditor() {
  if (fs.existsSync('./editor')) {
    fs.rmSync('./editor', { recursive: true }, (e) => {
      if (e) {
        throw e
      }
    })
  }

  try {
    exec(`cp -r ../editor/dist editor;`, (error, stdout, stderr) => {
      if (error) {
        throw new Error(error.message)
      }
      if (stderr && stderr.search('warning') !== 0) {
        throw new Error(stderr)
      }
    })
  } catch (e) {
    jslog(`× ${pkg.name}: Build failed due to an error.`)
    jslog(e)
  }
}

async function main() {
  await copyEditor()

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
      loader: {
        '.woff2': 'dataurl',
        '.woff': 'dataurl',
      },
    })
    jslog(`Built package.`)
  } catch (e) {
    jslog(`× Build failed due to an error.`)
    jslog(e)
  }
}

main()
