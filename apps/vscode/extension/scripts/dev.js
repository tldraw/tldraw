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
    await esbuild.build({
      entryPoints: ['./src/extension.ts'],
      outdir: 'dist/web',
      minify: false,
      bundle: true,
      format: 'cjs',
      target: 'es6',
      sourcemap: 'inline',
      define: {
        'process.env.NODE_ENV': '"development"',
      },
      tsconfig: './tsconfig.json',
      external: ['vscode'],
      incremental: true,
      watch: {
        onRebuild(err) {
          err ? console.error('❌ Failed') : console.log('✅ Updated')
        },
      },
    })

    console.log(`Built package.`)
  } catch (e) {
    console.log(`× Build failed due to an error.`)
    console.log(e)
  }
}

main()
