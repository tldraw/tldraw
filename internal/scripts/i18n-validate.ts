// Checks every translation in both catalogs (SDK and dotcom) against its English: ICU syntax,
// arguments, tags, select options and the plural forms each locale needs. Run in CI on every PR.
//
//   pnpm i18n-validate
//
// Translations that failed before this check existed are listed in i18n-validate-known-failures.json
// and reported as warnings. Fix them by removing their entry; an entry that no longer fails is an
// error, so the list only shrinks.

import { readFileSync } from 'fs'
import path from 'path'
import { problemId, validateCatalogs } from './lib/i18nValidate'

const REPO_ROOT = path.join(__dirname, '../..')
const KNOWN_FAILURES_PATH = path.join(__dirname, 'i18n-validate-known-failures.json')

function main() {
	const knownFailures = new Set<string>(JSON.parse(readFileSync(KNOWN_FAILURES_PATH, 'utf8')))
	const { errors, warnings, missingCount } = validateCatalogs(REPO_ROOT)

	const failing = new Set<string>()
	const newErrors = []
	let knownCount = 0
	for (const error of errors) {
		const id = problemId(error)
		failing.add(id)
		if (knownFailures.has(id)) knownCount++
		else newErrors.push(error)
	}
	const stale = [...knownFailures].filter((id) => !failing.has(id))

	for (const warning of warnings) console.warn(`warning: ${warning}`)
	if (knownCount)
		console.warn(`${knownCount} known failures (see ${path.basename(KNOWN_FAILURES_PATH)})`)
	console.log(`${missingCount} untranslated messages (these fall back to English)`)

	for (const error of newErrors) {
		console.error(`error: ${problemId(error)}: ${error.message}`)
	}
	for (const id of stale) {
		console.error(
			`error: ${id} is listed as a known failure but now passes; remove it from the list`
		)
	}
	if (newErrors.length || stale.length) {
		console.error(`\n${newErrors.length + stale.length} problems`)
		process.exit(1)
	}
	console.log('All translations are valid.')
}

main()
