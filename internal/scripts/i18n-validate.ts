// Checks every translation in both catalogs (SDK and dotcom) against its English: ICU syntax,
// arguments, tags, select options and the plural forms each locale needs. Runs in the i18n-translate
// workflow, not on every PR: a feature PR that renames an English placeholder shouldn't fail on 48
// locales it doesn't own.
//
//   pnpm i18n-validate [--verbose] | --entries <file>

import { readFileSync } from 'fs'
import path from 'path'
import { problemId, validateCatalogs, validateEntries } from './lib/i18nValidate'

const REPO_ROOT = path.join(__dirname, '../..')

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

	const verbose = process.argv.includes('--verbose')
	const { errors, warnings, missingCount, obsoleteCount } = validateCatalogs(REPO_ROOT)

	if (verbose) for (const warning of warnings) console.warn(`warning: ${warning}`)
	else if (warnings.length) console.warn(`${warnings.length} warnings (--verbose to list)`)
	console.log(`${missingCount} untranslated messages (these fall back to English)`)
	console.log(`${obsoleteCount} translations of removed messages (ignored)`)

	for (const error of errors) console.error(`error: ${problemId(error)}: ${error.message}`)
	if (errors.length) {
		console.error(`\n${errors.length} problems`)
		process.exit(1)
	}
	console.log('No translation problems.')
}

main()
