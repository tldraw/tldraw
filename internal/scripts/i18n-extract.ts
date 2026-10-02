import { execFileSync } from 'child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

// Writes assets/translations/main.json from the messages declared through `defineMessages` and
// `<F>`, so the English lives next to the code that shows it and the catalog is output rather
// than a file to hand-edit.
//
//   pnpm i18n-extract              # report what's declared, and any drift
//   pnpm i18n-extract --check      # same, but exit non-zero on drift (for CI)
//   pnpm i18n-extract --write      # regenerate main.json
//
// Changing an English string means editing its `defaultMessage` and running --write; main.json is
// still committed, because it's a published asset and what gets uploaded to Lokalise. --check is
// what keeps the two from parting ways, and so what makes "generated" true rather than a habit.
//
// --write refuses if any id is in main.json but declared nowhere, which now means someone added it
// to the catalog by hand. Writing anyway would drop it and its 49 translations, along with any
// override an app has keyed to it.
//
// The ids are stable names, not content hashes, so there is deliberately no
// --id-interpolation-pattern here: a descriptor without an id is an error, not something to
// paper over. `action.copy` has to survive a reworded English string, because apps override by key.
//
// Only `packages/*` is scanned. Some of the catalog is rendered only by an app — see
// `consumerMessages` in packages/tldraw, which declares those so they survive a write.

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

	// `@formatjs/cli` is declared by packages/tldraw, and pnpm links a workspace's binaries into
	// that workspace rather than the root, so this is where the binary lands.
	execFileSync(
		path.join(REPO_ROOT, 'packages/tldraw/node_modules/.bin/formatjs'),
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

	const catalog: Record<string, string> = JSON.parse(readFileSync(MAIN_JSON, 'utf8'))
	const extracted = extract()

	const catalogIds = new Set(Object.keys(catalog))
	const codeIds = new Set(Object.keys(extracted))

	const inBoth = [...codeIds].filter((id) => catalogIds.has(id)).sort()
	const notYetInCode = [...catalogIds].filter((id) => !codeIds.has(id)).sort()
	const newInCode = [...codeIds].filter((id) => !catalogIds.has(id)).sort()

	// A string that lives in both places has to say the same thing, or translators are working
	// from text the user never sees.
	const drifted = inBoth.filter((id) => extracted[id].defaultMessage !== catalog[id])

	console.log(`declared in code : ${codeIds.size}`)
	console.log(`in main.json     : ${catalogIds.size}`)
	console.log(`  a write adds   : ${newInCode.length}`)
	console.log(`  a write drops  : ${notYetInCode.length}`)
	console.log(`text drift       : ${drifted.length}`)

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
