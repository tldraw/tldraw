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
	// When adding placeholder-bearing fixes, write `value` in Lokalise's native
	// format, e.g. `[%1$s:workspaceName]`. Validation matches it against the ICU
	// `{workspaceName}` that the export produces by variable name, so the two forms
	// line up — but the value written to Lokalise must be the native one.
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

/**
 * Reduce a placeholder or tag to a format-independent identity, so the same
 * variable matches across the formats this pipeline mixes:
 *   - ICU `{workspaceName}` — what the Lokalise export produces (used in `english`)
 *   - Lokalise native `[%1$s:workspaceName]` — preferred in corrected `value`s
 *   - bare printf `%1$s` / `%s` / `%d` / `%@`
 * Named placeholders collapse to `var:<name>`; unnamed positional ones to
 * `pos:<n>` (or `pos:<order>` when unindexed). HTML tags become `tag:<name>` /
 * `tag:/<name>`, attributes ignored, so open/close balance is still checked.
 */
function placeholderIdentities(text: string): string[] {
	const ids: string[] = []
	let unnamed = 0

	// HTML tags: <b> / </b> / <br/>, attributes ignored.
	for (const m of text.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g)) {
		ids.push(`tag:${m[1]}${m[2].toLowerCase()}`)
	}

	// Lokalise placeholders `[% … ]`: named -> var:<name>, otherwise positional.
	// Strip them so the bare-printf scan below doesn't also match their insides.
	const stripped = text.replace(/\[%([^\]]*)\]/g, (_full, inner: string) => {
		const named = inner.match(/:([a-zA-Z0-9_]+)\s*$/)
		if (named) {
			ids.push(`var:${named[1]}`)
		} else {
			const indexed = inner.match(/(\d+)\$/)
			ids.push(indexed ? `pos:${indexed[1]}` : `pos:${unnamed++}`)
		}
		return ''
	})

	// ICU placeholders `{name}`.
	for (const m of stripped.matchAll(/\{([a-zA-Z0-9_]+)\}/g)) ids.push(`var:${m[1]}`)

	// Bare printf specifiers: `%1$s` (indexed) and `%s` / `%d` / `%@` (unindexed).
	for (const m of stripped.matchAll(/%(\d+)\$?[sd@]/g)) ids.push(`pos:${m[1]}`)
	for (const _m of stripped.matchAll(/%[sd@]/g)) ids.push(`pos:${unnamed++}`)

	return ids
}

/** Placeholder/tag identities present in `required` but missing (or under-counted) in `candidate`. */
function missingPlaceholders(required: string, candidate: string): string[] {
	const have = new Map<string, number>()
	for (const id of placeholderIdentities(candidate)) {
		have.set(id, (have.get(id) ?? 0) + 1)
	}
	const missing: string[] = []
	for (const id of placeholderIdentities(required)) {
		const count = have.get(id) ?? 0
		if (count <= 0) missing.push(id)
		else have.set(id, count - 1)
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

			const missing = missingPlaceholders(fix.english, value)
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
