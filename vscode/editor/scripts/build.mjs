/* eslint-disable */
import fs from 'fs'
import esbuild from 'esbuild'
import { createRequire } from 'module'

const pkg = createRequire(import.meta.url)('../package.json')

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
      },
    })

    console.log(`✔ ${pkg.name}: Build completed.`)
  } catch (e) {
    console.log(`× ${pkg.name}: Build failed due to an error.`)
    console.log(e)
  }
}

main()
