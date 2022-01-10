/* eslint-disable */
const fs = require('fs')
const esbuild = require('esbuild')

const { log: jslog } = console

async function main() {
  if (fs.existsSync('./dist')) {
    if (fs.existsSync('./dist/tests')) {
      fs.rmSync('./dist/tests', { recursive: true }, (e) => {
        if (e) {
          throw e
        }
      })
    }
  }

  try {
    // esbuild.buildSync({
    //   entryPoints: ['./src/test/runTest.ts'],
    //   outdir: 'dist/tests',
      
    //   minify: false,
    //   bundle: true,
    //   format: 'cjs',
    //   target: 'es6',
    //   platform: 'node',
    //   define: {
    //     'process.env.NODE_ENV': '"production"',
    //   },
    //   tsconfig: './tsconfig.json',
    //   external: ['vscode'],
    // })

    esbuild.buildSync({
      entryPoints: ['./src/test/suite/index.ts'],
      outdir: 'dist/tests/suite',
      
      minify: false,
      bundle: false,
      format: 'cjs',
      target: 'es6',
      platform: 'node',
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      tsconfig: './tsconfig.json'
    })
    
    jslog(`Built tests.`)
  } catch (e) {
    jslog(`× Build failed due to an error.`)
    jslog(e)
  }
}

main()
