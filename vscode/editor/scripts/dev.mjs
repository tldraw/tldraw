/* eslint-disable no-undef */
import fs from 'fs'
import esbuild from 'esbuild'

async function main() {
  if (!fs.existsSync('./dist')) {
    fs.mkdirSync('./dist')
  }

  try {
    esbuild.buildSync({
      entryPoints: ['src/index.tsx'],
      outfile: 'dist/index.js',
      minify: false,
      bundle: true,
      incremental: true,
      target: 'es6',
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      watch: {
        onRebuild(err) {
          err ? error('❌ Failed') : log('✅ Updated')
        },
      },
    })
  } catch (err) {
    process.exit(1)
  }
}

main()
