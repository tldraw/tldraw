/* eslint-disable no-undef */
import dotenv from 'dotenv'
import esbuildServe from 'esbuild-serve'
import fs from 'fs'
import path from 'path'

dotenv.config()

const { log: jslog } = console

async function main() {
  if (fs.existsSync('./dist')) {
    fs.rmSync('./dist', { recursive: true }, (e) => {
      if (e) {
        throw e
      }
    })
  }

  fs.mkdirSync('./dist')

  fs.readdirSync('./src/public').forEach((file) =>
    fs.copyFile(path.join('./src/public', file), path.join('./dist', file), (err) => {
      if (err) throw err
    })
  )

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
            err ? error('❌ Failed') : jslog('✅ Updated')
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
