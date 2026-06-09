import { copyFileSync, existsSync } from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import { build, type BuildOptions, type Plugin } from 'esbuild'
import { glob } from 'glob'
import kleur from 'kleur'
import rimraf from 'rimraf'
import { addJsExtensions } from './lib/add-extensions'
import { readJsonIfExists } from './lib/file'

/**
 * Allowlist of ESM-only dependencies to inline into the CommonJS build output.
 * We dual-publish CJS + ESM with `bundle: false`, so a dependency normally stays
 * external as a `require("x")` in the CJS output. That breaks CJS consumers when
 * `x` is ESM-only (`require` of an ES module throws on Node <20.19, and trips up
 * Jest/ts-node). Bundling these deps into the CJS output keeps the CJS path
 * working. The ESM build still leaves them external so ESM consumers resolve
 * them natively and keep dedup/tree-shaking.
 */
const ESM_ONLY = new Set(['rbush', 'jittered-fractional-indexing', 'nanoevents'])

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

	// allowlisted ESM-only deps that this package actually depends on. Only these
	// get inlined into the CJS build; every other package keeps the plain
	// `bundle: false` path with byte-for-byte identical output.
	const inlineDeps = Object.keys(packageJson.dependencies ?? {}).filter((dep) => ESM_ONLY.has(dep))

	// build CommonJS files to /dist-cjs
	await buildLibrary({
		sourceFiles,
		sourcePackageDir,
		inlineDeps,
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
		inlineDeps,
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
	inlineDeps,
}: {
	sourceFiles: string[]
	sourcePackageDir: string
	info: LibraryInfo
	inlineDeps: string[]
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

	// Only the CJS build inlines allowlisted ESM-only deps, and only when this
	// package actually depends on one. Every other build keeps the original
	// `bundle: false` path so its output stays byte-for-byte identical.
	const shouldInlineEsmDeps = info.moduleSystem === 'cjs' && inlineDeps.length > 0
	const bundleOptions: BuildOptions = shouldInlineEsmDeps
		? {
				bundle: true,
				plugins: [createCjsInlinePlugin(inlineDeps)],
				// preserve the inlined deps' license notices in dist-cjs
				legalComments: 'linked',
			}
		: { bundle: false }

	const res = await build({
		entryPoints: sourceFiles,
		outdir,
		format: info.moduleSystem,
		outExtension: info.moduleSystem === 'esm' ? { '.js': '.mjs' } : undefined,
		platform: 'neutral',
		sourcemap: true,
		target: 'es2022',
		define,
		...bundleOptions,
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

/**
 * Returns the package name for a bare import specifier, handling scoped names
 * and subpath imports. e.g. `rbush` -> `rbush`, `rbush/foo` -> `rbush`,
 * `@scope/name/sub` -> `@scope/name`.
 */
function getPackageName(specifier: string): string {
	if (specifier.startsWith('@')) {
		const [scope, name] = specifier.split('/')
		return `${scope}/${name}`
	}
	return specifier.split('/')[0]
}

/**
 * esbuild plugin for the bundled CJS pass. It inlines the allowlisted ESM-only
 * deps (and their transitive deps) into the output while keeping our own
 * per-file source mirror and all other deps external.
 */
function createCjsInlinePlugin(inlineDeps: string[]): Plugin {
	const inlineSet = new Set(inlineDeps)
	return {
		name: 'tldraw-cjs-inline-esm-deps',
		setup(pluginBuild) {
			pluginBuild.onResolve({ filter: /.*/ }, (args) => {
				// let esbuild resolve the entry points themselves.
				if (args.kind === 'entry-point') return null

				// we're inside an allowlisted dep's own subtree: bundle everything
				// transitively. rbush v4 depends on quickselect, which is also
				// ESM-only, so leaving it external would just move the bug down a
				// level.
				if (args.importer.includes('node_modules')) return null

				// from here on the importer is our own source.

				// keep relative imports external so we don't inline sibling source
				// files into each entry point and collapse the per-file mirror.
				if (args.path.startsWith('.')) {
					return { path: args.path, external: true }
				}

				// bundle bare specifiers for allowlisted deps into the CJS output.
				if (inlineSet.has(getPackageName(args.path))) {
					return null
				}

				// every other bare specifier stays external.
				return { path: args.path, external: true }
			})
		},
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
