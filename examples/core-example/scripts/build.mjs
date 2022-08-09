/* eslint-disable */
import esbuild from 'esbuild'
import fs from 'fs'
import { createRequire } from 'module'

const pkg = createRequire(import.meta.url)('../package.json')

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
    esbuild.buildSync({
      entryPoints: ['./src/index.tsx'],
      outdir: 'dist',
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
      metafile: false,
      sourcemap: false,
    })

    fs.copyFile('./src/index.html', './dist/index.html', (err) => {
      if (err) throw err
    })

    jslog(`✔ ${pkg.name}: Build completed.`)
  } catch (e) {
    jslog(`× ${pkg.name}: Build failed due to an error.`)
    jslog(e)
  }
}

main()
