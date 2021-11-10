/* eslint-disable no-undef */
import fs from 'fs'
import esbuildServe from 'esbuild-serve'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
  if (!fs.existsSync('./dist')) {
    fs.mkdirSync('./dist')
  }

  fs.copyFile('./src/index.html', './dist/index.html', (err) => {
    if (err) throw err
  })

  try {
    await esbuildServe(
      {
        entryPoints: ['src/index.tsx'],
        outfile: 'dist/index.js',
        minify: false,
        bundle: true,
        sourcemap: true,
        incremental: true,
        format: 'cjs',
        target: 'es6',
        define: {
          'process.env.NODE_ENV': '"development"',
          'process.env.LIVEBLOCKS_PUBLIC_API_KEY': `"${process.env.LIVEBLOCKS_PUBLIC_API_KEY}"`,
        },
        watch: {
          onRebuild(err) {
            err ? error('❌ Failed') : log('✅ Updated')
          },
        },
      },
      {
        port: 5420,
        root: './dist',
        live: true,
      }
    )
  } catch (err) {
    process.exit(1)
  }
}

main()
