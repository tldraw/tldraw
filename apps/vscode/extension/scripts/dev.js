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
    await esbuild.build({
      entryPoints: ['./src/extension.ts'],
      outdir: 'dist/web',
      minify: false,
      bundle: true,
      format: 'cjs',
      target: 'es6',
      sourcemap: 'inline',
      platform: 'node',
      define: {
        'process.env.NODE_ENV': '"development"',
      },
      tsconfig: './tsconfig.json',
      external: ['vscode'],
      incremental: true,
      watch: {
        onRebuild(err) {
          err ? console.error('❌ Failed') : jslog('✅ Updated')
        },
      },
    })

    jslog(`Built package.`)
  } catch (e) {
    jslog(`× Build failed due to an error.`)
    jslog(e)
  }
}

main()
