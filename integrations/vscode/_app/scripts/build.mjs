/* eslint-disable no-undef */
import fs from 'fs'
import esbuild from 'esbuild'

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
    outfile: 'dist/bundle.js',
    bundle: true,
    minify: true,
    sourcemap: true,
    incremental: false,
    target: ['chrome58', 'firefox57', 'safari11', 'edge18'],
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  })
  .catch(() => process.exit(1))

if (!fs.existsSync('../extension/app')) {
  fs.mkdirSync('../extension/app')
}

for (const file of ['index.html', 'favicon.ico']) {
  fs.copyFile(`./src/${file}`, `../extension/app/${file}`, (err) => {
    if (err) throw err
  })
}

esbuild
  .build({
    entryPoints: ['src/index.tsx'],
    outfile: '../extension/app/bundle.js',
    bundle: true,
    minify: true,
    sourcemap: true,
    incremental: false,
    target: ['chrome58', 'firefox57', 'safari11', 'edge18'],
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  })
  .catch(() => process.exit(1))
