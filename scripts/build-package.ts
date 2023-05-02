import { build } from 'esbuild'
import { copyFileSync, existsSync } from 'fs'
import glob from 'glob'
import kleur from 'kleur'
import path from 'path'
import rimraf from 'rimraf'
import { pathToFileURL } from 'url'
import { addJsExtensions } from './lib/add-extensions'

/** Prepares the package for publishing. the tarball in case it will be written to disk. */
async function buildPackage({ sourcePackageDir }: { sourcePackageDir: string }) {
	// this depends on `build-types` being run first, but we'll rely on turbo to
	// make that happen.

	if (!existsSync(path.join(sourcePackageDir, 'src/index.ts'))) {
		throw new Error(`No src/index.ts file found in '${sourcePackageDir}'!`)
	}

	rimraf.sync(path.join(sourcePackageDir, 'dist'))

	// then copy over the source .ts files
	const sourceFiles = glob
		.sync(path.join(sourcePackageDir, 'src/**/*.ts?(x)'))
		// ignore test files
		.filter(
			(file) =>
				!(file.includes('/__tests__/') || file.includes('.test.') || file.includes('/test/'))
		)

	// build js files to /dist
	await buildEsm({ sourceFiles, sourcePackageDir })
	await buildCjs({ sourceFiles, sourcePackageDir })

	copyFileSync(
		path.join(sourcePackageDir, `api/public.d.ts`),
		path.join(sourcePackageDir, 'dist-cjs/index.d.ts')
	)

	copyFileSync(
		path.join(sourcePackageDir, `api/public.d.ts`),
		path.join(sourcePackageDir, 'dist-esm/index.d.mts')
	)
}

/** This uses esbuild to build the esm version of the package */
async function buildEsm({
	sourceFiles,
	sourcePackageDir,
}: {
	sourceFiles: string[]
	sourcePackageDir: string
}) {
	const outdir = path.join(sourcePackageDir, 'dist-esm')
	rimraf.sync(outdir)
	const res = await build({
		entryPoints: sourceFiles,
		outdir,
		bundle: false,
		platform: 'neutral',
		sourcemap: true,
		format: 'esm',
		outExtension: { '.js': '.mjs' },
	})

	addJsExtensions(path.join(sourcePackageDir, 'dist-esm'))

	if (res.errors.length) {
		console.error(kleur.red('Build failed with errors:'))
		console.error(res.errors)
		throw new Error('esm build failed')
	}
}

/** This uses esbuild to build the cjs version of the package */
async function buildCjs({
	sourceFiles,
	sourcePackageDir,
}: {
	sourceFiles: string[]
	sourcePackageDir: string
}) {
	const outdir = path.join(sourcePackageDir, 'dist-cjs')
	rimraf.sync(outdir)
	const res = await build({
		entryPoints: sourceFiles,
		outdir,
		bundle: false,
		platform: 'neutral',
		sourcemap: true,
		format: 'cjs',
	})

	if (res.errors.length) {
		console.error(kleur.red('Build failed with errors:'))
		console.error(res.errors)
		throw new Error('commonjs build failed')
	}
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	// module was called directly
	;(async () => {
		await buildPackage({
			sourcePackageDir: process.cwd(),
		})
	})()
}
