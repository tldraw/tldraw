import { LokaliseApi } from '@lokalise/node-api'
import fs from 'fs'
import path from 'path'

const LOKALISE_API_TOKEN = process.env.LOKALISE_API_TOKEN!
const SDK_PROJECT_ID = process.env.LOKALISE_TLDRAW_PROJECT_ID ?? '7889709363dce3272fc3f5.45273344'
const DOTCOM_PROJECT_ID = process.env.LOKALISE_PROJECT_ID ?? '798928056725133a8769b5.60370878'

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

async function findKeyId(
	api: LokaliseApi,
	projectId: string,
	keyName: string
): Promise<number | null> {
	// The Lokalise API supports filtering keys by name
	const result = await api.keys().list({
		project_id: projectId,
		filter_keys: keyName,
		limit: 10,
	})

	for (const key of result.items) {
		if (key.key_name.web === keyName || key.key_name.other === keyName) {
			return key.key_id
		}
	}

	return null
}

async function updateKeyTranslations(
	api: LokaliseApi,
	projectId: string,
	keyId: number,
	translations: Array<{ language_iso: string; translation: string }>
): Promise<void> {
	await api.keys().update(
		keyId,
		{ translations: translations },
		{ project_id: projectId }
	)
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

		console.log(`\n[${projectLabel}] Looking up key: ${issue.key} (en: "${issue.english}")`)

		let keyId: number | null
		try {
			keyId = await findKeyId(api, projectId, issue.key)
		} catch (err) {
			console.error(`  ERROR looking up key: ${err}`)
			errorCount++
			continue
		}

		if (!keyId) {
			console.log(`  SKIP: Key not found in Lokalise`)
			skippedCount++
			continue
		}

		console.log(`  Found key_id: ${keyId}`)

		const translations: Array<{ language_iso: string; translation: string }> = []

		for (const [locale, info] of Object.entries(issue.locales_affected)) {
			if (!info.suggested) continue

			// Lokalise uses underscores in some locale codes
			const lokaliseLocale = locale

			console.log(
				`  ${lokaliseLocale}: "${info.current}" → "${info.suggested}" (${info.problem})`
			)
			translations.push({
				language_iso: lokaliseLocale,
				translation: info.suggested,
			})
		}

		if (translations.length === 0) {
			console.log(`  SKIP: No translations to update`)
			skippedCount++
			continue
		}

		if (dryRun) {
			console.log(`  DRY RUN: Would update ${translations.length} translation(s)`)
			updatedCount += translations.length
		} else {
			try {
				await updateKeyTranslations(api, projectId, keyId, translations)
				console.log(`  Updated ${translations.length} translation(s)`)
				updatedCount += translations.length
			} catch (err) {
				console.error(`  ERROR updating translations: ${err}`)
				errorCount++
			}
		}
	}

	console.log(`\n=== Summary ===`)
	console.log(`Updated: ${updatedCount} translation(s)`)
	console.log(`Skipped: ${skippedCount} key(s)`)
	console.log(`Errors: ${errorCount}`)
	if (dryRun) {
		console.log(`\nThis was a dry run. Run without --dry-run to apply changes.`)
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
