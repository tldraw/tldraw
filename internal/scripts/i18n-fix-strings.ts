import { Key, LokaliseApi } from '@lokalise/node-api'

// Corrects individual machine translations directly in Lokalise. The automated
// i18n pipeline orders Google translations for new keys (see
// i18n-upload-strings.ts), and occasionally a string comes back wrong: a word
// translated in the wrong sense, or placeholders/tags scrambled. This script
// patches those specific (key, locale) translations in place.
//
// It only ever touches the translations listed in FIXES, never English, and by
// default runs as a dry run. Pass --apply to actually write to Lokalise.
//
//   yarn i18n-fix-strings            # dry run, prints the before/after diff
//   yarn i18n-fix-strings --apply    # write the corrections to Lokalise

interface StringFix {
	/** Lokalise key name (the hashed key shared across all locales). */
	key: string
	/** English source string, for reviewer context and placeholder validation. */
	english: string
	/** Corrected translations, keyed by repo locale code (e.g. 'fr', 'ko-kr'). */
	translations: Record<string, { value: string; note: string }>
}

const FIXES: StringFix[] = [
	{
		key: '9983381c21',
		english: 'Clear search',
		translations: {
			fr: {
				value: 'Effacer la recherche',
				note: 'Was "Recherche propre" (clean/proper search) — translated "Clear" as an adjective instead of the verb.',
			},
		},
	},
	// Note: the workspace-invite scramble found in the auto-generated i18n PR lived on
	// key a8c9ad7ea5, which no longer exists in Lokalise — the English string was edited
	// (now key 23dcace54a, "...Create a free account to continue.") and is currently
	// untranslated. Re-review those invite strings after the next translation order.
	// When adding placeholder-bearing fixes, use Lokalise's native format, e.g.
	// `[%1$s:workspaceName]`, not the ICU `{workspaceName}` that the export produces.
]

function formatError(error: unknown) {
	if (error instanceof Error) {
		return error.stack ?? error.message
	}

	try {
		return JSON.stringify(error, null, 2)
	} catch {
		return String(error)
	}
}

function getEnv(name: string) {
	const value = process.env[name]
	if (!value) throw new Error(`Missing required env var: ${name}`)
	return value
}

/** Lokalise uses ISO codes like `ko_KR`; the repo uses `ko-kr`. Normalize both for matching. */
function normalizeIso(iso: string) {
	return iso.toLowerCase().replace(/_/g, '-')
}

/** A key name is per-platform in Lokalise; the hashed key is identical across platforms. */
function keyNameMatches(key: Key, name: string) {
	const keyName = key.key_name as unknown
	if (typeof keyName === 'string') return keyName === name
	if (keyName && typeof keyName === 'object') return Object.values(keyName).includes(name)
	return false
}

/** Pull out ICU placeholders, Lokalise placeholders, printf specifiers, and HTML tags. */
function extractTokens(text: string): string[] {
	const tokens: string[] = []
	const patterns = [/\{[^}]+\}/g, /\[%[^\]]*%\]/g, /%\d*\$?[sd@]/g, /<\/?[a-zA-Z][^>]*>/g]
	for (const re of patterns) {
		const matches = text.match(re)
		if (matches) tokens.push(...matches)
	}
	return tokens
}

/** Tokens that exist in `required` but are missing (or under-counted) in `candidate`. */
function missingTokens(required: string, candidate: string): string[] {
	const have = new Map<string, number>()
	for (const token of extractTokens(candidate)) {
		have.set(token, (have.get(token) ?? 0) + 1)
	}
	const missing: string[] = []
	for (const token of extractTokens(required)) {
		const count = have.get(token) ?? 0
		if (count <= 0) missing.push(token)
		else have.set(token, count - 1)
	}
	return missing
}

async function i18nFixStrings() {
	const apply = process.argv.includes('--apply')
	const markReviewed = process.argv.includes('--mark-reviewed')
	const projectId = getEnv('LOKALISE_PROJECT_ID')
	const apiKey = getEnv('LOKALISE_API_TOKEN')
	const lokaliseApi = new LokaliseApi({ apiKey })

	console.log(
		apply
			? 'Applying translation fixes to Lokalise...'
			: 'Dry run — pass --apply to write these fixes to Lokalise.'
	)

	let applied = 0
	let alreadyCorrect = 0
	let skipped = 0
	let refused = 0

	for (const fix of FIXES) {
		const { items } = await lokaliseApi.keys().list({
			project_id: projectId,
			filter_keys: fix.key,
			include_translations: 1,
			limit: 100,
		})
		const key = items.find((item) => keyNameMatches(item, fix.key))
		if (!key) {
			console.warn(`\n⚠ Key ${fix.key} ("${fix.english}") not found in project — skipping.`)
			skipped += Object.keys(fix.translations).length
			continue
		}

		console.log(`\n${fix.key} — "${fix.english}"`)
		for (const [locale, { value, note }] of Object.entries(fix.translations)) {
			const translation = key.translations.find(
				(t) => normalizeIso(t.language_iso) === normalizeIso(locale)
			)
			if (!translation) {
				console.warn(`  ${locale}: no translation found in Lokalise — skipping.`)
				skipped++
				continue
			}

			const current = translation.translation
			if (current === value) {
				console.log(`  ${locale}: already correct.`)
				alreadyCorrect++
				continue
			}

			const missing = missingTokens(fix.english, value)
			if (missing.length) {
				console.error(
					`  ${locale}: REFUSED — corrected value is missing placeholder(s)/tag(s): ${missing.join(', ')}`
				)
				refused++
				continue
			}

			console.log(`  ${locale}:`)
			console.log(`    - ${current}`)
			console.log(`    + ${value}`)
			console.log(`    why: ${note}`)

			if (apply) {
				await lokaliseApi.translations().update(
					translation.translation_id,
					{
						translation: value,
						...(markReviewed ? { is_reviewed: true, is_unverified: false } : {}),
					},
					{ project_id: projectId }
				)
				applied++
			}
		}
	}

	console.log(
		`\nSummary: ${apply ? `updated ${applied}` : 'dry run (no changes written)'}, ` +
			`already correct ${alreadyCorrect}, skipped ${skipped}, refused ${refused}.`
	)
	if (!apply) {
		console.log('Re-run with --apply to write these changes to Lokalise.')
	}
	if (refused > 0) {
		process.exit(1)
	}
}

i18nFixStrings().catch((error) => {
	console.error('Failed to fix i18n strings:')
	console.error(formatError(error))
	process.exit(1)
})
