/* eslint-disable */
const fs = require('fs')
const path = require('path')
const esbuild = require('esbuild')

async function main() {
  if (fs.existsSync('./dist')) {
    fs.rmdirSync('./dist', { recursive: true })
  }

  fs.mkdirSync('./dist')

  esbuild.build({
    entryPoints: ['./src/index.ts'],
    outdir: 'dist/cjs',
    minify: false,
    bundle: true,
    format: 'cjs',
    target: 'es6',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    tsconfig: './tsconfig.build.json',
    external: ['react', 'react-dom'],
  })

  var files = fs.readdirSync('src/assets')

  for (var i = 0; i < files.length; i++) {
    fs.copyFileSync(path.join('src/assets', files[i]), path.join('dist', files[i]))
  }
}

main()
