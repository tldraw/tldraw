import { LokaliseApi } from '@lokalise/node-api'
import fs from 'fs'
import path from 'path'

const LOKALISE_API_TOKEN = process.env.LOKALISE_API_TOKEN!
const SDK_PROJECT_ID =
	process.env.LOKALISE_TLDRAW_PROJECT_ID ?? '7889709363dce3272fc3f5.45273344'
const DOTCOM_PROJECT_ID =
	process.env.LOKALISE_PROJECT_ID ?? '798928056725133a8769b5.60370878'

interface LocaleAffected {
	current: string
	problem: string
	suggested: string | null
}

interface Issue {
	severity: string
	type: string
	source: 'sdk' | 'dotcom'
	key: string
	english: string
	locales_affected: Record<string, LocaleAffected>
}

interface IssuesFile {
	issues: Issue[]
}

/**
 * Convert our locale codes (e.g. "ko-kr", "zh-cn", "pt-br") to Lokalise format
 * (e.g. "ko_KR", "zh_CN", "pt_BR"). Simple codes like "ja", "de" stay the same.
 */
function toLokaliseLocale(locale: string): string {
	if (!locale.includes('-')) return locale
	const [lang, region] = locale.split('-')
	return `${lang}_${region.toUpperCase()}`
}

interface TranslationInfo {
	translationId: number
	currentValue: string
	languageIso: string
}

async function findKeyTranslations(
	api: LokaliseApi,
	projectId: string,
	keyName: string,
	targetLocales: string[]
): Promise<{ keyId: number; translations: Map<string, TranslationInfo> } | null> {
	const result = await api.keys().list({
		project_id: projectId,
		filter_keys: keyName,
		limit: 10,
		include_translations: 1,
	})

	for (const key of result.items) {
		if (key.key_name.web === keyName || key.key_name.other === keyName) {
			const translationMap = new Map<string, TranslationInfo>()
			for (const t of key.translations ?? []) {
				if (targetLocales.includes(t.language_iso)) {
					translationMap.set(t.language_iso, {
						translationId: t.translation_id,
						currentValue: t.translation,
						languageIso: t.language_iso,
					})
				}
			}
			return { keyId: key.key_id, translations: translationMap }
		}
	}

	return null
}

async function main() {
	const dryRun = process.argv.includes('--dry-run')
	const issuesPath = path.resolve(__dirname, '../../translation-issues.json')
	const issuesFile: IssuesFile = JSON.parse(fs.readFileSync(issuesPath, 'utf8'))

	if (!LOKALISE_API_TOKEN) {
		console.error('LOKALISE_API_TOKEN environment variable is required')
		process.exit(1)
	}

	const api = new LokaliseApi({ apiKey: LOKALISE_API_TOKEN })

	// Filter to only issues that have suggested fixes
	const fixableIssues = issuesFile.issues.filter((issue) => {
		const locales = Object.entries(issue.locales_affected)
		return locales.some(([, info]) => info.suggested !== null)
	})

	console.log(`Found ${fixableIssues.length} issues with suggested fixes`)
	if (dryRun) {
		console.log('=== DRY RUN MODE — no changes will be made ===\n')
	}

	let updatedCount = 0
	let skippedCount = 0
	let errorCount = 0

	for (const issue of fixableIssues) {
		const projectId = issue.source === 'sdk' ? SDK_PROJECT_ID : DOTCOM_PROJECT_ID
		const projectLabel = issue.source === 'sdk' ? 'SDK' : 'Dotcom'

		// Build a map of Lokalise locale -> our locale + fix info
		const localeFixMap = new Map<
			string,
			{ ourLocale: string; info: LocaleAffected }
		>()
		for (const [locale, info] of Object.entries(issue.locales_affected)) {
			if (!info.suggested) continue
			localeFixMap.set(toLokaliseLocale(locale), { ourLocale: locale, info })
		}

		if (localeFixMap.size === 0) continue

		const targetLocales = Array.from(localeFixMap.keys())

		console.log(`\n[${projectLabel}] Looking up key: ${issue.key} (en: "${issue.english}")`)

		let keyData: Awaited<ReturnType<typeof findKeyTranslations>>
		try {
			keyData = await findKeyTranslations(api, projectId, issue.key, targetLocales)
		} catch (err) {
			console.error(`  ERROR looking up key: ${err}`)
			errorCount++
			continue
		}

		if (!keyData) {
			console.log(`  SKIP: Key not found in Lokalise`)
			skippedCount++
			continue
		}

		console.log(`  Found key_id: ${keyData.keyId}`)

		for (const [lokaliseLocale, { ourLocale, info }] of localeFixMap) {
			const existing = keyData.translations.get(lokaliseLocale)
			if (!existing) {
				console.log(`  SKIP ${ourLocale}: No existing translation found in Lokalise for ${lokaliseLocale}`)
				skippedCount++
				continue
			}

			// Verify the current value matches what we expect (safety check)
			if (existing.currentValue !== info.current) {
				console.log(
					`  SKIP ${ourLocale}: Current value in Lokalise "${existing.currentValue}" doesn't match expected "${info.current}" — may have been fixed already`
				)
				skippedCount++
				continue
			}

			console.log(
				`  ${ourLocale} (${lokaliseLocale}): "${info.current}" → "${info.suggested}" (${info.problem})`
			)

			if (dryRun) {
				updatedCount++
			} else {
				try {
					await api.translations().update(
						existing.translationId,
						{ translation: info.suggested!, is_reviewed: false },
						{ project_id: projectId }
					)
					updatedCount++
				} catch (err) {
					console.error(`  ERROR updating ${ourLocale}: ${err}`)
					errorCount++
				}
			}
		}
	}

	console.log(`\n=== Summary ===`)
	console.log(`Updated: ${updatedCount} translation(s)`)
	console.log(`Skipped: ${skippedCount}`)
	console.log(`Errors: ${errorCount}`)
	if (dryRun) {
		console.log(`\nThis was a dry run. Run without --dry-run to apply changes.`)
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
