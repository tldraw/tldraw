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

  if (!fs.existsSync('./dist')) {
    fs.mkdirSync('./dist')
  }

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
        incremental: true,
        target: 'es6',
        jsxFactory: 'React.createElement',
        jsxFragment: 'React.Fragment',
        define: {
          'process.env.NODE_ENV': '"production"',
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
