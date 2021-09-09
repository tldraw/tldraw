/* eslint-disable no-undef */
import fs from 'fs'
import esbuild from 'esbuild'
import serve, { error, log } from 'create-serve'

const isDevServer = process.argv.includes('--dev')

esbuild
  .build({
    entryPoints: ['src/index.tsx'],
    bundle: true,
    outdir: 'dist',
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

for (const file of ['index.html']) {
  fs.copyFile(`./src/${file}`, `./dist/${file}`, (err) => {
    if (err) throw err
  })
}
if (isDevServer) {
  serve.start({
    port: 5000,
    root: './dist',
    live: true,
  })
}
