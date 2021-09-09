/* eslint-disable no-undef */
import fs from 'fs'
import esbuild from 'esbuild'
import serve, { error, log } from 'create-serve'

const isDevServer = process.argv.includes('--dev')

if (!fs.existsSync('./dist')) {
  fs.mkdirSync('./dist')
}

for (const file of ['styles.css', 'index.html']) {
  fs.copyFile(`./src/${file}`, './dist/${file}', (err) => {
    if (err) throw err
  })
}

esbuild
  .build({
    entryPoints: ['src/index.tsx'],
    bundle: true,
    outfile: 'dist/bundle.js',
    minify: false,
    sourcemap: true,
    incremental: isDevServer,
    platform: 'browser',
    target: ['chrome58', 'firefox57', 'safari11', 'edge18'],
    define: {
      'process.env.NODE_ENV': isDevServer ? '"development"' : '"production"',
    },
    watch: isDevServer && {
      onRebuild(err) {
        serve.update()
        err ? error('❌ Failed') : log('✅ Updated')
      },
    },
  })
  .catch(() => process.exit(1))

if (isDevServer) {
  serve.start({
    port: 5000,
    root: './dist',
    live: true,
  })
}
