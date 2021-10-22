/* eslint-disable no-undef */
import fs from 'fs'
import esbuild from 'esbuild'
import serve, { error, log } from 'create-serve'

if (!fs.existsSync('./dist')) {
  fs.mkdirSync('./dist')
}

for (const file of ['index.html', 'favicon.ico']) {
  fs.copyFile(`./src/${file}`, `./dist/${file}`, (err) => {
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
    incremental: true,
    target: ['chrome58', 'firefox57', 'safari11', 'edge18'],
    define: {
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
  port: 5000,
  root: './dist',
  live: true,
})
