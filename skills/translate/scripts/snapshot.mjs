// Builds the generator's workspace: the committed repo (HEAD) without any existing translation,
// so new candidates can't copy old wording. English, code and context notes stay. This is a
// procedure, not a sandbox: it only works if the generator is told to stay inside it.
//
// Glossaries are built from existing translations, so they are left out unless asked for
// (incremental and full-review runs pass them; retranslation doesn't).

import { execFileSync } from 'node:child_process'
import {
	existsSync,
	lstatSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	readlinkSync,
	realpathSync,
	rmSync,
} from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const KEEP = {
	'assets/translations': ['main.json', 'en.json', 'languages.json'],
	'apps/dotcom/client/public/tla/locales': ['en.json'],
}
const REMOVE = [
	'apps/dotcom/client/public/tla/locales-compiled',
	'packages/assets/translations',
	'internal/i18n/translation-state.json',
	// These quote real translations: the Lokalise fix list, examples in skill docs and test
	// fixtures, and an e2e test that matches French UI text.
	'internal/scripts/i18n-fix-strings.ts',
	'skills/review-translations',
	'skills/translate/references/dispositions.md',
	'skills/translate/scripts/pipeline.test.mjs',
	'skills/translate/scripts/translation-state.test.mjs',
	'apps/dotcom/client/e2e',
]

function walk(directory, visit) {
	for (const name of readdirSync(directory)) {
		const path = join(directory, name)
		visit(path)
		const stat = lstatSync(path, { throwIfNoEntry: false })
		if (stat?.isDirectory()) walk(path, visit)
	}
}

export function snapshot(repoRoot, outDir, { withGlossaries = false } = {}) {
	outDir = resolve(outDir)
	if (existsSync(outDir) && readdirSync(outDir).length) {
		throw new Error(`${outDir} is not empty`)
	}
	mkdirSync(outDir, { recursive: true })
	try {
		build(repoRoot, outDir, withGlossaries)
	} catch (error) {
		rmSync(outDir, { recursive: true, force: true })
		throw error
	}
	return outDir
}

function build(repoRoot, outDir, withGlossaries) {
	const archive = execFileSync('git', ['archive', '--format=tar', 'HEAD'], {
		cwd: repoRoot,
		maxBuffer: 1024 * 1024 * 1024,
	})
	execFileSync('tar', ['-x', '-C', outDir], { input: archive })

	for (const [directory, keep] of Object.entries(KEEP)) {
		const path = join(outDir, directory)
		if (!existsSync(path)) continue
		for (const name of readdirSync(path)) {
			if (name.endsWith('.json') && !keep.includes(name)) rmSync(join(path, name))
		}
	}
	for (const path of REMOVE) rmSync(join(outDir, path), { recursive: true, force: true })
	if (!withGlossaries) rmSync(join(outDir, 'internal/i18n/glossary'), { recursive: true, force: true })

	checkClean(outDir)
}

/**
 * Fails if anything that looks like a translation catalog is left. Symlinks that point out of the
 * snapshot are removed, since following one would leave it.
 */
function checkClean(outDir) {
	const root = realpathSync(outDir)
	const locales = JSON.parse(readFileSync(join(root, 'assets/translations/languages.json'), 'utf8'))
		.map(({ locale }) => locale)
		.filter((locale) => locale !== 'en')
	const problems = []
	walk(root, (path) => {
		const stat = lstatSync(path, { throwIfNoEntry: false })
		if (!stat) return
		if (stat.isSymbolicLink()) {
			const target = resolve(dirname(path), readlinkSync(path))
			if (relative(root, target).startsWith('..')) {
				rmSync(path)
				console.warn(`snapshot: removed ${relative(root, path)}, which links outside it`)
			}
			return
		}
		if (path.endsWith('.json') && locales.includes(basename(path, '.json'))) {
			problems.push(relative(root, path))
		}
	})
	if (problems.length) {
		throw new Error(`Snapshot still holds translation catalogs:\n${problems.join('\n')}`)
	}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const args = process.argv.slice(2)
	const positional = args.filter((arg) => !arg.startsWith('--'))
	try {
		if (positional.length !== 1 || args.some((a) => a.startsWith('--') && a !== '--with-glossaries')) {
			throw new Error(
				'Usage: node skills/translate/scripts/snapshot.mjs <out-dir> [--with-glossaries]'
			)
		}
		const out = snapshot(process.cwd(), positional[0], {
			withGlossaries: args.includes('--with-glossaries'),
		})
		console.log(out)
	} catch (error) {
		console.error(error.message)
		process.exitCode = 1
	}
}
