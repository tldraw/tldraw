import { execFileSync } from 'child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

// Extracts the SDK's co-located messages and compares them to assets/translations/main.json.
//
// The SDK is mid-migration: its strings are moving out of main.json and into `defineMessages` /
// `<F>` next to the code that renders them. Once every string has moved, extraction becomes the
// thing that writes main.json and the catalog stops being hand-edited. Until then this runs as a
// check, because extraction is destructive by nature: a key nobody moved into code is simply
// absent from the output, and silently dropping it would take that string's 49 translations with
// it — along with any override an app has keyed to it.
//
//   pnpm i18n-extract              # report coverage and drift
//   pnpm i18n-extract --check      # same, but exit non-zero on drift (for CI)
//   pnpm i18n-extract --add-new    # append ids that only exist in code; never removes anything
//   pnpm i18n-extract --write      # overwrite main.json; refuses while coverage is incomplete
//
// The SDK's ids are stable names, not content hashes, so there is deliberately no
// --id-interpolation-pattern here: a descriptor without an id is an error, not something to
// paper over. `action.copy` has to survive a reworded English string, because apps override by key.

const REPO_ROOT = path.resolve(__dirname, '../..')
const MAIN_JSON = path.join(REPO_ROOT, 'assets/translations/main.json')

/** Packages whose strings share the one SDK catalog. */
const PACKAGES = ['tldraw', 'commenting', 'mentions', 'editor']

interface Extracted {
	[id: string]: { defaultMessage: string; description?: string }
}

function extract(): Extracted {
	const globs = PACKAGES.map((p) => `packages/${p}/src/**/*.{ts,tsx}`)
	const outDir = mkdtempSync(path.join(tmpdir(), 'tldraw-i18n-'))
	const outFile = path.join(outDir, 'extracted.json')

	// `@formatjs/cli` is a devDependency of packages/tldraw, so it isn't on the root's script path;
	// the hoisted binary is.
	execFileSync(
		path.join(REPO_ROOT, 'node_modules/.bin/formatjs'),
		[
			'extract',
			...globs,
			'--out-file',
			outFile,
			'--additional-function-names',
			'useMsg',
			'--additional-component-names',
			'F',
			'--ignore',
			'**/*.test.ts',
			'--ignore',
			'**/*.test.tsx',
			'--throws',
		],
		{ cwd: REPO_ROOT, stdio: ['ignore', 'ignore', 'inherit'] }
	)

	return existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : {}
}

function main() {
	const args = process.argv.slice(2)
	const check = args.includes('--check')
	const write = args.includes('--write')
	const addNew = args.includes('--add-new')

	const catalog: Record<string, string> = JSON.parse(readFileSync(MAIN_JSON, 'utf8'))
	const extracted = extract()

	const catalogIds = new Set(Object.keys(catalog))
	const codeIds = new Set(Object.keys(extracted))

	const migrated = [...codeIds].filter((id) => catalogIds.has(id)).sort()
	const notYetInCode = [...catalogIds].filter((id) => !codeIds.has(id)).sort()
	const newInCode = [...codeIds].filter((id) => !catalogIds.has(id)).sort()

	// A string that lives in both places has to say the same thing, or translators are working
	// from text the user never sees.
	const drifted = migrated.filter((id) => extracted[id].defaultMessage !== catalog[id])

	const pct = catalogIds.size ? Math.round((migrated.length / catalogIds.size) * 100) : 0
	console.log(`catalog keys        : ${catalogIds.size}`)
	console.log(`ids found in code   : ${codeIds.size}`)
	console.log(`  already migrated  : ${migrated.length} (${pct}% of the catalog)`)
	console.log(`  new, not in catalog: ${newInCode.length}`)
	console.log(`still only in catalog: ${notYetInCode.length}`)
	console.log(`text drift          : ${drifted.length}`)

	if (drifted.length) {
		console.log('\nThese differ between code and main.json:')
		for (const id of drifted.slice(0, 40)) {
			console.log(`  ${id}`)
			console.log(`    code     : ${JSON.stringify(extracted[id].defaultMessage)}`)
			console.log(`    main.json: ${JSON.stringify(catalog[id])}`)
		}
		if (drifted.length > 40) console.log(`  ... and ${drifted.length - 40} more`)
	}

	if (newInCode.length) {
		console.log('\nNew ids, would be added to the catalog:')
		for (const id of newInCode.slice(0, 40)) console.log(`  ${id}`)
		if (newInCode.length > 40) console.log(`  ... and ${newInCode.length - 40} more`)
	}

	// Additive counterpart to --write, for while the catalog is still the thing Lokalise uploads:
	// a message declared in code has to reach main.json to reach a translator.
	if (addNew) {
		if (!newInCode.length) {
			console.log('\nNothing to add.')
			return
		}
		const raw = readFileSync(MAIN_JSON, 'utf8')
		const tail = raw.slice(raw.lastIndexOf('}') + 1)
		const next: Record<string, string> = { ...catalog }
		for (const id of newInCode) next[id] = extracted[id].defaultMessage
		writeFileSync(MAIN_JSON, JSON.stringify(next, null, '\t') + tail)
		console.log(`\nAdded ${newInCode.length} keys to assets/translations/main.json`)
		return
	}

	if (write) {
		if (notYetInCode.length) {
			console.error(
				`\nRefusing to write: ${notYetInCode.length} keys are still only in main.json, and ` +
					`writing now would drop them and their translations. Move them into code first, or ` +
					`delete them deliberately.`
			)
			process.exit(1)
		}
		const next: Record<string, string> = {}
		for (const id of Object.keys(extracted).sort()) next[id] = extracted[id].defaultMessage
		writeFileSync(MAIN_JSON, JSON.stringify(next, null, '\t') + '\n')
		console.log(`\nWrote ${Object.keys(next).length} keys to assets/translations/main.json`)
		return
	}

	if (check && drifted.length) {
		console.error('\nText drift between code and main.json. Fix the mismatches above.')
		process.exit(1)
	}
}

main()
