import { copyFileSync, existsSync, readFileSync } from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import { build } from 'esbuild'
import { glob } from 'glob'
import kleur from 'kleur'
import rimraf from 'rimraf'
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

	// api-extractor only rolls up what's transitively exported from `src/index.ts`. Packages with
	// additional `exports` subpaths (e.g. `./server`) need their own `.d.ts` files, which we take
	// from the plain `tsc --build` output in `.tsbuild` (already produced by the `build-types`
	// task that runs before this one) rather than trying to roll each subpath up separately.
	const exportsMap = packageJson.exports
	if (exportsMap && typeof exportsMap === 'object') {
		for (const key of Object.keys(exportsMap)) {
			if (key === '.') continue
			const entry = exportsMap[key]
			if (typeof entry !== 'string' || !entry.startsWith('./src/') || !entry.endsWith('.ts')) {
				// not a source-file subpath (e.g. a `./*.css` passthrough) — nothing to build
				continue
			}
			const relPath = entry.slice('./src/'.length).replace(/\.tsx?$/, '')
			copySubpathDeclaration(sourcePackageDir, relPath, key)
		}
	}
}

/**
 * Copies a subpath's `.tsbuild/<relPath>.d.ts` output into `dist-cjs`/`dist-esm`, then follows its
 * relative imports/re-exports to copy any local `.d.ts` files it depends on, so the declaration
 * resolves correctly once shipped (relative imports in `.d.ts` files aren't rewritten the way
 * `addJsExtensions` rewrites runtime imports).
 */
function copySubpathDeclaration(
	sourcePackageDir: string,
	relPath: string,
	exportsKey: string,
	seen = new Set<string>()
) {
	if (seen.has(relPath)) return
	seen.add(relPath)

	const tsbuildDts = path.join(sourcePackageDir, '.tsbuild', `${relPath}.d.ts`)
	if (!existsSync(tsbuildDts)) {
		throw new Error(
			`No .tsbuild output found for exports entry '${exportsKey}' (expected ${tsbuildDts}). Make sure build-types has run first.`
		)
	}
	copyFileSync(tsbuildDts, path.join(sourcePackageDir, 'dist-cjs', `${relPath}.d.ts`))
	copyFileSync(tsbuildDts, path.join(sourcePackageDir, 'dist-esm', `${relPath}.d.mts`))

	const content = readFileSync(tsbuildDts, 'utf8')
	const importRegex = /from\s+['"](\.[^'"]*)['"]/g
	for (const match of content.matchAll(importRegex)) {
		const importedRelPath = path.join(path.dirname(relPath), match[1])
		copySubpathDeclaration(sourcePackageDir, importedRelPath, exportsKey, seen)
	}
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
