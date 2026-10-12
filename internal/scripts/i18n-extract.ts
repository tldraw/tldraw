import { execFileSync } from 'child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

// Regenerates both English catalogues from the messages declared in their source, so the English
// lives next to the code that shows it rather than in a file someone edits by hand.
//
//   pnpm i18n-extract              # regenerate both
//   pnpm i18n-extract --check      # write nothing; exit non-zero if either would change (for CI)
//   pnpm i18n-extract --project=sdk|dotcom
//
// Both catalogues are committed: each is what gets uploaded to Lokalise, and the SDK's is a
// published asset (`assetUrls.translations.main`) that self-hosters fetch. --check is what keeps
// them from parting ways with the source, and so what makes "generated" true rather than a habit.
//
// Two catalogues rather than one, deliberately. They disagree about ids, which is the whole reason
// they stay apart:
//
//   sdk     stable names (`action.copy`), authored. An app overrides by key, so an id has to
//           survive a reworded English string. There is deliberately no --id-interpolation-pattern:
//           a descriptor without an id is an error, not something to paper over.
//   dotcom  md5 content hashes, injected at build by @formatjs/unplugin. App copy churns, nothing
//           outside dotcom keys off these, and a changed string becoming a new string is fine.
//
// Alongside i18n-upload-strings and i18n-download-strings, which already handle both projects the
// same way.
//
// Only `packages/*` is scanned for the SDK. Part of its catalogue is rendered only by an app — see
// `consumerMessages` in packages/tldraw, which declares those so they survive a write.

const REPO_ROOT = path.resolve(__dirname, '../..')

// `@formatjs/cli` is declared by packages/tldraw and apps/dotcom/client, and pnpm links a
// workspace's binaries into that workspace rather than the root.
const FORMATJS = path.join(REPO_ROOT, 'packages/tldraw/node_modules/.bin/formatjs')

type Mode = 'write' | 'check'

function formatjs(args: string[]) {
	execFileSync(FORMATJS, args, { cwd: REPO_ROOT, stdio: ['ignore', 'ignore', 'inherit'] })
}

function tmp(name: string) {
	return path.join(mkdtempSync(path.join(tmpdir(), 'tldraw-i18n-')), name)
}

// --- the SDK catalogue -------------------------------------------------------------------------

const MAIN_JSON = path.join(REPO_ROOT, 'assets/translations/main.json')
const SDK_PACKAGES = ['tldraw', 'commenting', 'mentions', 'editor']

interface Extracted {
	[id: string]: { defaultMessage: string; description?: string }
}

function extractSdk(mode: Mode): boolean {
	const outFile = tmp('extracted.json')
	formatjs([
		'extract',
		...SDK_PACKAGES.map((p) => `packages/${p}/src/**/*.{ts,tsx}`),
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
	])
	const extracted: Extracted = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : {}
	const catalog: Record<string, string> = JSON.parse(readFileSync(MAIN_JSON, 'utf8'))

	const codeIds = new Set(Object.keys(extracted))
	const catalogIds = new Set(Object.keys(catalog))
	const added = [...codeIds].filter((id) => !catalogIds.has(id)).sort()
	const dropped = [...catalogIds].filter((id) => !codeIds.has(id)).sort()
	// A string in both places has to say the same thing, or translators work from text no one sees.
	const drifted = [...codeIds]
		.filter((id) => catalogIds.has(id) && extracted[id].defaultMessage !== catalog[id])
		.sort()

	console.log('sdk')
	console.log(`  declared in code : ${codeIds.size}`)
	console.log(`  in main.json     : ${catalogIds.size}`)
	console.log(`  added            : ${added.length}`)
	console.log(`  dropped          : ${dropped.length}`)
	console.log(`  text drift       : ${drifted.length}`)

	for (const id of drifted.slice(0, 20)) {
		console.log(`    ${id}`)
		console.log(`      code     : ${JSON.stringify(extracted[id].defaultMessage)}`)
		console.log(`      main.json: ${JSON.stringify(catalog[id])}`)
	}
	for (const id of added.slice(0, 20)) console.log(`    + ${id}`)
	for (const id of dropped.slice(0, 20)) console.log(`    - ${id}`)

	const differs = added.length > 0 || dropped.length > 0 || drifted.length > 0
	if (mode === 'check') return differs

	if (dropped.length) {
		console.error(
			`\nRefusing to write: ${dropped.length} ids are in main.json but declared nowhere, which ` +
				`means they were added to the catalogue by hand. Writing would drop them and their ` +
				`translations, along with any override an app has keyed to them.`
		)
		process.exit(1)
	}
	const next: Record<string, string> = {}
	for (const id of Object.keys(extracted).sort()) next[id] = extracted[id].defaultMessage
	writeFileSync(MAIN_JSON, JSON.stringify(next, null, '\t') + '\n')
	console.log(`  wrote ${Object.keys(next).length} ids to assets/translations/main.json`)
	return differs
}

// --- the dotcom catalogue ----------------------------------------------------------------------

const DOTCOM = path.join(REPO_ROOT, 'apps/dotcom/client')
const DOTCOM_EN = 'public/tla/locales/en.json'
const DOTCOM_COMPILED = 'public/tla/locales-compiled'

/**
 * Extracts dotcom's English, then compiles every locale to AST for the runtime. The compile reads
 * the whole locales folder, so it picks up what Lokalise last sent down as well as the English
 * just written.
 */
function extractDotcom(mode: Mode): boolean {
	const enOut = mode === 'write' ? path.join(DOTCOM, DOTCOM_EN) : tmp('dotcom-en.json')
	const compiledOut = mode === 'write' ? path.join(DOTCOM, DOTCOM_COMPILED) : tmp('dotcom-compiled')

	formatjs([
		'extract',
		'apps/dotcom/client/src/{tla,pages,components}/**/*.ts*',
		'--out-file',
		enOut,
		'--additional-component-names',
		'F',
		'--id-interpolation-pattern',
		'[md5:contenthash:hex:10]',
		'--format',
		'lokalise',
	])

	// The compile needs the English it just wrote to sit alongside the other locales. In check mode
	// nothing is written in place, so assemble the folder in a temp copy.
	let localesIn = path.join(DOTCOM, 'public/tla/locales')
	if (mode === 'check') {
		const staged = tmp('dotcom-locales')
		cpSync(localesIn, staged, { recursive: true })
		cpSync(enOut, path.join(staged, 'en.json'))
		localesIn = staged
	}
	formatjs(['compile-folder', localesIn, compiledOut, '--format', 'lokalise', '--ast'])

	console.log('dotcom')
	const extracted = JSON.parse(readFileSync(enOut, 'utf8'))
	console.log(`  declared in code : ${Object.keys(extracted).length}`)
	console.log(`  compiled locales : ${readdirSync(compiledOut).length}`)

	if (mode === 'write') {
		console.log(`  wrote ${DOTCOM_EN} and ${DOTCOM_COMPILED}/`)
		return false
	}

	const committed = readFileSync(path.join(DOTCOM, DOTCOM_EN), 'utf8')
	const differs = committed !== readFileSync(enOut, 'utf8')
	console.log(`  en.json differs  : ${differs}`)
	return differs
}

// --- entry point -------------------------------------------------------------------------------

function main() {
	const args = process.argv.slice(2)
	const mode: Mode = args.includes('--check') ? 'check' : 'write'
	const projectArg = args.find((a) => a.startsWith('--project='))?.split('=')[1]
	if (projectArg && projectArg !== 'sdk' && projectArg !== 'dotcom') {
		console.error(`Unknown --project: ${projectArg}. Use sdk or dotcom.`)
		process.exit(1)
	}

	let differs = false
	if (projectArg !== 'dotcom') differs = extractSdk(mode) || differs
	if (projectArg !== 'sdk') differs = extractDotcom(mode) || differs

	if (mode === 'check' && differs) {
		console.error(
			'\nA catalogue no longer matches the messages declared in its source. Run ' +
				'`pnpm i18n-extract` and commit the result.'
		)
		process.exit(1)
	}
}

main()
