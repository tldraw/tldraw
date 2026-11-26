// Checks every translation in both catalogs (SDK and dotcom) against its English: ICU syntax,
// arguments, tags, select options and the plural forms each locale needs. Runs in the workflows
// that change translations (the weekly strings download and i18n-translate), not on every PR: a
// feature PR that renames an English placeholder shouldn't fail on 48 locales it doesn't own.
//
//   pnpm i18n-validate [--prune] [--verbose] | --entries <file>
//
// Failures that predate this check are listed in i18n-validate-known-failures.json, one entry per
// error, so a new kind of breakage in an already-listed message still fails. Entries that no longer
// fail are reported; --prune removes them (the weekly strings download runs it).

import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { problemId, validateCatalogs, validateEntries } from './lib/i18nValidate'

const REPO_ROOT = path.join(__dirname, '../..')
const KNOWN_FAILURES_PATH = path.join(__dirname, 'i18n-validate-known-failures.json')

// `--entries <file>` checks proposed translations (a JSON array of {project, locale, key, text})
// instead of the catalogs, and prints a JSON object of the failing ones. The translate skill's
// apply.mjs uses it before writing.
function checkEntriesFile(file: string) {
	const entries = JSON.parse(readFileSync(path.resolve(file), 'utf8'))
	console.log(JSON.stringify(validateEntries(REPO_ROOT, entries)))
}

function main() {
	const entriesFlag = process.argv.indexOf('--entries')
	if (entriesFlag !== -1) return checkEntriesFile(process.argv[entriesFlag + 1])

	const prune = process.argv.includes('--prune')
	const verbose = process.argv.includes('--verbose')
	const knownFailures: string[] = JSON.parse(readFileSync(KNOWN_FAILURES_PATH, 'utf8'))
	const known = new Set(knownFailures)
	const { errors, warnings, missingCount, obsoleteCount } = validateCatalogs(REPO_ROOT)

	const failing = new Set(errors.map((e) => `${problemId(e)}: ${e.message}`))
	const newErrors = [...failing].filter((id) => !known.has(id))
	const fixed = knownFailures.filter((id) => !failing.has(id))

	if (verbose) for (const warning of warnings) console.warn(`warning: ${warning}`)
	else if (warnings.length) console.warn(`${warnings.length} warnings (--verbose to list)`)
	console.log(`${missingCount} untranslated messages (these fall back to English)`)
	console.log(`${obsoleteCount} translations of removed messages (ignored)`)

	if (fixed.length) {
		if (prune) {
			const remaining = knownFailures.filter((id) => failing.has(id))
			writeFileSync(KNOWN_FAILURES_PATH, JSON.stringify(remaining, null, '\t') + '\n')
			console.log(`Removed ${fixed.length} fixed entries from the known failures.`)
		} else {
			for (const id of fixed) console.warn(`fixed: ${id}`)
			console.warn(`${fixed.length} known failures now pass; run pnpm i18n-validate --prune`)
		}
	}
	console.log(`${knownFailures.length - fixed.length} known failures remain`)

	for (const error of newErrors) console.error(`error: ${error}`)
	if (newErrors.length) {
		console.error(`\n${newErrors.length} problems`)
		process.exit(1)
	}
	console.log('No new translation problems.')
}

main()
