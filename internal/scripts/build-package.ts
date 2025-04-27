import { build } from 'esbuild'
import { copyFileSync, existsSync } from 'fs'
import glob from 'glob'
import kleur from 'kleur'
import path from 'path'
import rimraf from 'rimraf'
import { pathToFileURL } from 'url'
import { addJsExtensions } from './lib/add-extensions'
import { readJsonIfExists } from './lib/file'

interface LibraryInfo {
	name: string
	version: string
	moduleSystem: 'esm' | 'cjs'
}

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

	const packageJson = await readJsonIfExists(path.join(sourcePackageDir, 'package.json'))
	if (!packageJson) {
		throw new Error('No package.json found in source package dir')
	}

	const packageName = packageJson.name
	if (typeof packageName !== 'string') throw new Error('package.json name is not a string')
	const packageVersion = packageJson.version
	if (typeof packageVersion !== 'string') throw new Error('package.json version is not a string')

	// build CommonJS files to /dist-cjs
	await buildLibrary({
		sourceFiles,
		sourcePackageDir,
		info: {
			name: packageName,
			version: packageVersion,
			moduleSystem: 'cjs',
		},
	})

	// build ES Module files to /dist-esm
	await buildLibrary({
		sourceFiles,
		sourcePackageDir,
		info: {
			name: packageName,
			version: packageVersion,
			moduleSystem: 'esm',
		},
	})

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
async function buildLibrary({
	sourceFiles,
	sourcePackageDir,
	info,
}: {
	sourceFiles: string[]
	sourcePackageDir: string
	info: LibraryInfo
}) {
	const dirName = `dist-${info.moduleSystem}`
	const outdir = path.join(sourcePackageDir, dirName)
	rimraf.sync(outdir)

	const define: Record<string, string> = {}
	if (process.env.TLDRAW_BEMO_URL) {
		define['process.env.TLDRAW_BEMO_URL'] = JSON.stringify(process.env.TLDRAW_BEMO_URL)
	}

	// we use `globalThis` instead of `process.env` because although it'll get compiled away in
	// library code, we use the un-compiled versions in our own apps and not every environment
	// supports process.env.
	define['globalThis.TLDRAW_LIBRARY_NAME'] = JSON.stringify(info.name)
	define['globalThis.TLDRAW_LIBRARY_VERSION'] = JSON.stringify(info.version)
	define['globalThis.TLDRAW_LIBRARY_MODULES'] = JSON.stringify(info.moduleSystem)
	define['globalThis.TLDRAW_LIBRARY_IS_BUILD'] = JSON.stringify(true)

	const res = await build({
		entryPoints: sourceFiles,
		outdir,
		format: info.moduleSystem,
		outExtension: info.moduleSystem === 'esm' ? { '.js': '.mjs' } : undefined,
		bundle: false,
		platform: 'neutral',
		sourcemap: true,
		target: 'es2022',
		define,
	})

	if (info.moduleSystem === 'esm') {
		addJsExtensions(path.join(sourcePackageDir, 'dist-esm'))
	}

	if (res.errors.length) {
		console.error(kleur.red('Build failed with errors:'))
		console.error(res.errors)
		throw new Error('esm build failed')
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
