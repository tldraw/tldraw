/* eslint-disable */
const esbuild = require('esbuild')
const pkg = require('../package.json')

const { log: jslog } = console

async function main() {
  try {
    await esbuild.build({
      entryPoints: ['src/index.tsx'],
      outfile: 'dist/index.js',
      bundle: true,
      minify: false,
      sourcemap: true,
      incremental: true,
      target: ['chrome58', 'firefox57', 'safari11', 'edge18'],
      define: {
        'process.env.NODE_ENV': '"development"',
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
