/* eslint-disable no-undef */
import fs from 'fs'
import esbuild from 'esbuild'
import serve, { error, log } from 'create-serve'

if (!fs.existsSync('./dist')) {
  fs.mkdirSync('./dist')
}

fs.copyFile('./src/index.html', './dist/index.html', (err) => {
  if (err) throw err
})

esbuild
  .build({
    entryPoints: ['src/index.tsx'],
    outfile: 'dist/index.js',
    minify: false,
    bundle: true,
    sourcemap: true,
    incremental: true,
    format: 'esm',
    target: 'esnext',
    define: {
      'process.env.LIVEBLOCKS_PUBLIC_API_KEY': process.env.LIVEBLOCKS_PUBLIC_API_KEY,
      'process.env.NODE_ENV': '"development"',
    },
    watch: {
      onRebuild(err) {
        serve.update()
        err ? error('❌ Failed') : log('✅ Updated')
      },
    },
  })
  .catch(() => process.exit(1))

serve.start({
  port: 5420,
  root: './dist',
  live: true,
})
