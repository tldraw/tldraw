import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
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
// of the SDK pays for the whole barrel again. The `export *` entry asserts the opposite so that a
// renamed or deleted canary fails loudly instead of matching nothing forever.

interface Entry {
	name: string
	source: string
	sizeLimitBytes?: number
	mustNotInclude?: string[]
	mustInclude?: string[]
}

// Each canary is public API that the default editor never imports. If one of them is ever wired
// into the default tree on purpose, swap it for another consumer-only module rather than
// deleting the check.
const TLDRAW_CANARIES = [
	// only reachable via parseTldrawJsonFile / parseAndLoadDocument
	'packages/tldraw/src/lib/utils/tldr/buildFromV1Document.ts',
	// a standalone component, not rendered by <Tldraw />
	'packages/tldraw/src/lib/TldrawImage.tsx',
	// a UI primitive no default menu uses; drags in @radix-ui/react-select via the radix-ui umbrella
	'packages/tldraw/src/lib/ui/components/primitives/TldrawUiSelect.tsx',
	'node_modules/@radix-ui/react-select/',
]
// TldrawEditor uses useLocalStore, never the standalone store hook
const EDITOR_CANARIES = ['packages/editor/src/lib/hooks/useTLStore.ts']

const ENTRIES: Entry[] = [
	{
		name: "import { Tldraw } from 'tldraw'",
		source: `export { Tldraw } from '${REPO_ROOT}/packages/tldraw/src/index'`,
		// Measured at 1,657,637 B when this check was added, and 1,738,900 B with every
		// sideEffects declaration ignored, so the limit sits between the two. Bump it deliberately
		// when the SDK legitimately grows; it exists to make growth visible, not to forbid it.
		sizeLimitBytes: 1_700_000,
		mustNotInclude: [...TLDRAW_CANARIES, ...EDITOR_CANARIES],
	},
	{
		name: "import { TldrawEditor } from '@tldraw/editor'",
		source: `export { TldrawEditor } from '${REPO_ROOT}/packages/editor/src/index'`,
		mustNotInclude: EDITOR_CANARIES,
	},
	{
		name: "export * from 'tldraw'",
		source: `export * from '${REPO_ROOT}/packages/tldraw/src/index'`,
		mustInclude: [...TLDRAW_CANARIES, ...EDITOR_CANARIES],
	},
]

async function measure(entry: Entry, dir: string) {
	const entryFile = join(dir, 'entry.ts')
	writeFileSync(entryFile, entry.source)
	const result = await build({
		absWorkingDir: REPO_ROOT,
		entryPoints: [entryFile],
		bundle: true,
		minify: true,
		format: 'esm',
		platform: 'browser',
		target: 'es2022',
		external: ['react', 'react-dom', 'react/jsx-runtime'],
		// Same defines as build-package.ts, so the version-registration code is as small as it is
		// in a published build
		define: {
			'globalThis.TLDRAW_LIBRARY_IS_BUILD': 'true',
			'globalThis.TLDRAW_LIBRARY_NAME': '"tldraw"',
			'globalThis.TLDRAW_LIBRARY_VERSION': '"0.0.0"',
			'globalThis.TLDRAW_LIBRARY_MODULES': '"esm"',
		},
		write: false,
		logLevel: 'silent',
		metafile: true,
	})
	const output = result.outputFiles[0].contents
	// Metafile paths are relative to absWorkingDir, i.e. the repo root
	const inputs = Object.keys(Object.values(result.metafile.outputs)[0].inputs)
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
	let tooBig = false
	let badInputs = false
	try {
		for (const entry of ENTRIES) {
			const { minified, gzipped, inputs } = await measure(entry, dir)
			nicelog(
				`${kleur.cyan().bold(entry.name)}  ${kb(minified)} minified, ${kb(gzipped)} gzipped, ${inputs.length} modules`
			)

			if (entry.sizeLimitBytes && minified > entry.sizeLimitBytes) {
				tooBig = true
				nicelog(
					`  ${kleur.red().bold('ERROR')} exceeds the size limit of ${kb(entry.sizeLimitBytes)} minified`
				)
			}

			for (const pattern of entry.mustNotInclude ?? []) {
				if (inputs.some((file) => file.includes(pattern))) {
					badInputs = true
					nicelog(
						`  ${kleur.red().bold('ERROR')} includes ${pattern}, which nothing in this entry should need`
					)
				}
			}

			for (const pattern of entry.mustInclude ?? []) {
				if (!inputs.some((file) => file.includes(pattern))) {
					badInputs = true
					nicelog(
						`  ${kleur.red().bold('ERROR')} does not include ${pattern}; was the canary renamed or removed?`
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

	if (badInputs) {
		nicelog(
			kleur.red(
				'\nThe SDK bundle includes code that consumers should not pay for. Check that every package in packages/* declares "sideEffects" (yarn check-packages) and that no module runs code at import time. Canaries live in internal/scripts/check-sdk-bundle.ts.'
			)
		)
	}
	if (tooBig) {
		nicelog(
			kleur.red(
				'\nThe SDK bundle has grown past its size limit. If the growth is intended, bump sizeLimitBytes in internal/scripts/check-sdk-bundle.ts.'
			)
		)
	}
	if (badInputs || tooBig) process.exit(1)
}

main()
