/* eslint-disable */
import esbuild from 'esbuild'
import fs from 'fs'
import { createRequire } from 'module'
import path from 'path'

const pkg = createRequire(import.meta.url)('../package.json')

const { log: jslog } = console

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
    jslog(`✔ ${pkg.name}: Build completed.`)
  } catch (e) {
    jslog(`× ${pkg.name}: Build failed due to an error.`)
    jslog(e)
  }
}

main()
