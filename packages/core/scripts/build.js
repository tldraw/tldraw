const esbuild = require('esbuild')

const name = process.env.npm_package_name || ''

async function main() {
  try {
    esbuild.buildSync({
      entryPoints: ['./src/index.ts'],
      outdir: 'dist/cjs',
      minify: true,
      bundle: true,
      target: 'esnext',
      format: 'cjs',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      tsconfig: './tsconfig.json',
    })

    console.log(`✔ ${name}: Built package.`)
  } catch (e) {
    console.log(`× ${name}: Build failed due to an error.`)
  }
}

main()
