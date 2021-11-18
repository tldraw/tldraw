/* eslint-disable */
import fs from 'fs'
import path from 'path'
import esbuild from 'esbuild'
import dotenv from 'dotenv'
import { createRequire } from 'module'

const pkg = createRequire(import.meta.url)('../package.json')

async function main() {
  try {
    esbuild.buildSync({
      entryPoints: ['./src/index.tsx'],
      outfile: 'dist/index.js',
      minify: false,
      bundle: true,
      format: 'cjs',
      target: 'es6',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      tsconfig: './tsconfig.json',
      define: {
        'process.env.NODE_ENV': '"production"',
        'process.env.LIVEBLOCKS_PUBLIC_API_KEY': `"${process.env.LIVEBLOCKS_PUBLIC_API_KEY}"`,
      },
      metafile: false,
      sourcemap: false,
    })

    fs.readdirSync('./src/public').forEach((file) =>
      fs.copyFile(path.join('./src/public', file), path.join('./dist', file), (err) => {
        if (err) throw err
      })
    )
    console.log(`✔ ${pkg.name}: Build completed.`)
  } catch (e) {
    console.log(`× ${pkg.name}: Build failed due to an error.`)
    console.log(e)
  }
}

main()
