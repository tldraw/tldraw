import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, relative } from 'path'
import { gzipSync } from 'zlib'
import { build } from 'esbuild'
import kleur from 'kleur'
import minimist from 'minimist'
import { REPO_ROOT } from './lib/file'
import { nicelog } from './lib/nicelog'

// Bundles what a typical consumer imports from the SDK packages, reports the size, and asserts that
// code only reachable through the package barrel is not dragged in. The canaries are modules that
// nothing in the default `<Tldraw />` tree imports; if one shows up in the bundle then some package
// lost its `sideEffects` declaration or a module grew an import-time side effect, and every consumer
// of the SDK pays for the whole barrel again.

interface Entry {
	name: string
	source: string
	sizeLimitBytes?: number
	mustNotInclude?: string[]
}

const ENTRIES: Entry[] = [
	{
		name: "import { Tldraw } from 'tldraw'",
		source: `export { Tldraw } from '${REPO_ROOT}/packages/tldraw/src/index'`,
		sizeLimitBytes: 1_800_000,
		mustNotInclude: [
			'packages/tldraw/src/lib/utils/tldr/buildFromV1Document.ts',
			'packages/tldraw/src/lib/TldrawImage.tsx',
			'packages/tldraw/src/lib/ui/components/primitives/TldrawUiSelect.tsx',
			'node_modules/@radix-ui/react-select/',
		],
	},
	{
		name: "import { TldrawEditor } from '@tldraw/editor'",
		source: `export { TldrawEditor } from '${REPO_ROOT}/packages/editor/src/index'`,
		mustNotInclude: ['packages/editor/src/lib/hooks/useTLStore.ts'],
	},
	{
		name: "export * from 'tldraw'",
		source: `export * from '${REPO_ROOT}/packages/tldraw/src/index'`,
	},
]

async function measure(entry: Entry, dir: string) {
	const entryFile = join(dir, 'entry.ts')
	writeFileSync(entryFile, entry.source)
	const result = await build({
		entryPoints: [entryFile],
		bundle: true,
		minify: true,
		format: 'esm',
		platform: 'browser',
		target: 'es2022',
		external: ['react', 'react-dom', 'react/jsx-runtime'],
		loader: {
			'.css': 'empty',
			'.svg': 'dataurl',
			'.png': 'dataurl',
			'.woff2': 'dataurl',
			'.json': 'json',
		},
		define: {
			'globalThis.TLDRAW_LIBRARY_IS_BUILD': 'true',
			'globalThis.TLDRAW_LIBRARY_NAME': '"tldraw"',
			'globalThis.TLDRAW_LIBRARY_VERSION': '"0.0.0"',
			'globalThis.TLDRAW_LIBRARY_MODULES': '"esm"',
			'process.env.NODE_ENV': '"production"',
		},
		write: false,
		logLevel: 'silent',
		metafile: true,
	})
	const output = result.outputFiles[0].contents
	const inputs = Object.keys(Object.values(result.metafile.outputs)[0].inputs).map((file) =>
		relative(REPO_ROOT, join(dir, file))
	)
	return {
		minified: output.length,
		gzipped: gzipSync(output, { level: 9 }).length,
		inputs,
	}
}

function kb(bytes: number) {
	return `${(bytes / 1024).toFixed(1)} KB`
}

async function main() {
	const args = minimist(process.argv.slice(2))
	const dir = mkdtempSync(join(tmpdir(), 'tldraw-bundle-'))
	let failed = false
	try {
		for (const entry of ENTRIES) {
			const { minified, gzipped, inputs } = await measure(entry, dir)
			nicelog(
				`${kleur.cyan().bold(entry.name)}  ${kb(minified)} minified, ${kb(gzipped)} gzipped, ${inputs.length} modules`
			)

			if (entry.sizeLimitBytes && minified > entry.sizeLimitBytes) {
				failed = true
				nicelog(
					`  ${kleur.red().bold('ERROR')} exceeds the size limit of ${kb(entry.sizeLimitBytes)} minified`
				)
			}

			for (const pattern of entry.mustNotInclude ?? []) {
				const hits = inputs.filter((file) => file.includes(pattern))
				if (hits.length) {
					failed = true
					nicelog(
						`  ${kleur.red().bold('ERROR')} includes ${pattern}, which nothing in this entry should need`
					)
				}
			}

			if (args.verbose) {
				for (const file of inputs.sort()) nicelog(`    ${file}`)
			}
		}
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}

	if (failed) {
		nicelog(
			kleur.red(
				'\nThe SDK bundle includes code that consumers should not pay for. Check that every package in packages/* declares "sideEffects" (yarn check-packages) and that no module runs code at import time.'
			)
		)
		process.exit(1)
	}
}

main()
