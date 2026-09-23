import fs from 'fs'
import path from 'path'
import { LokaliseApi, QueuedProcess } from '@lokalise/node-api'

// Pushes the English source strings to Lokalise and orders machine translations
// for anything still untranslated (see i18n-download-strings.ts for the other
// half of the pipeline).
//
// Two Lokalise projects are in play:
//   - the dotcom project (LOKALISE_PROJECT_ID), source apps/dotcom/client/public/tla/locales/en.json
//   - the tldraw SDK project (LOKALISE_TLDRAW_PROJECT_ID), source assets/translations/main.json
// Only the dotcom project orders translations automatically; SDK orders are
// still placed by hand.

const UPLOAD_POLL_INTERVAL_MS = 2000
const UPLOAD_MAX_POLLS = 120
/** Items per page when listing keys and languages, within Lokalise's per-endpoint maximums. */
const PAGE_LIMIT = 500
/** Anything pricier than this wants a human to look at it first. */
const MAX_ORDER_TOTAL = 10

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

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function getEnv(name: string) {
	const value = process.env[name]
	if (!value) throw new Error(`Missing required env var: ${name}`)
	return value
}

/**
 * Lokalise's file upload is asynchronous: it returns a queued process and
 * creates the keys in the background. Poll until it's done — otherwise anything
 * we ask about the project next still describes the state from before the
 * upload, and freshly added strings look like they don't exist.
 */
async function waitForUpload(lokaliseApi: LokaliseApi, projectId: string, processId: string) {
	for (let i = 0; i < UPLOAD_MAX_POLLS; i++) {
		const queuedProcess = await lokaliseApi
			.queuedProcesses()
			.get(processId, { project_id: projectId })

		if (queuedProcess.status === 'finished') return queuedProcess
		if (queuedProcess.status === 'failed' || queuedProcess.status === 'cancelled') {
			throw new Error(
				`Upload ${queuedProcess.status}: ${queuedProcess.message || 'No message'}\n${JSON.stringify(queuedProcess, null, 2)}`
			)
		}

		await sleep(UPLOAD_POLL_INTERVAL_MS)
	}

	throw new Error(`Upload timed out after ${UPLOAD_MAX_POLLS} polls for project ${projectId}`)
}

function logUploadResult(queuedProcess: QueuedProcess) {
	const files = queuedProcess.details?.files ?? []
	if (!files.length) {
		console.log('  Upload finished, but Lokalise reported no file details.')
		return
	}
	for (const file of files) {
		console.log(
			`  ${file.name_original ?? 'file'}: ${file.key_count_inserted ?? 0} inserted, ` +
				`${file.key_count_updated ?? 0} updated, ${file.key_count_skipped ?? 0} skipped ` +
				`(${file.key_count_total ?? 0} total).`
		)
	}
}

async function uploadFile(
	lokaliseApi: LokaliseApi,
	options: { projectId: string; filePath: string; filename: string; cleanupMode: boolean }
) {
	const { projectId, filePath, filename, cleanupMode } = options
	const file = fs.readFileSync(filePath, 'utf8')
	console.log(`Uploading ${filename}...`)

	const uploadResult = await lokaliseApi.files().upload(projectId, {
		data: Buffer.from(file).toString('base64'),
		filename,
		lang_iso: 'en',
		detect_icu_plurals: true,
		cleanup_mode: cleanupMode,
	})

	if (!uploadResult.process_id) {
		throw new Error(`Upload did not return a process_id: ${JSON.stringify(uploadResult, null, 2)}`)
	}

	const queuedProcess = await waitForUpload(lokaliseApi, projectId, uploadResult.process_id)
	console.log(`Uploaded ${filename} successfully!`)
	logUploadResult(queuedProcess)
}

/** Every target language in the project, English excluded. Paginated: there are 50+ of them. */
async function listTargetLanguageIsos(lokaliseApi: LokaliseApi, projectId: string) {
	const isos: string[] = []
	for (let page = 1; ; page++) {
		const result = await lokaliseApi
			.languages()
			.list({ project_id: projectId, limit: PAGE_LIMIT, page })
		isos.push(...result.items.map((item) => item.lang_iso))
		if (result.items.length < PAGE_LIMIT) break
	}
	return isos.filter((lang) => lang !== 'en')
}

/** Every key with at least one missing translation. Paginated: a big batch would otherwise truncate. */
async function listUntranslatedKeyIds(lokaliseApi: LokaliseApi, projectId: string) {
	const keyIds: number[] = []
	let cursor: string | undefined
	do {
		const result = await lokaliseApi.keys().list({
			project_id: projectId,
			filter_untranslated: 1,
			pagination: 'cursor',
			limit: PAGE_LIMIT,
			...(cursor ? { cursor } : {}),
		})
		keyIds.push(...result.items.map((item) => item.key_id))
		cursor = result.hasNextCursor() ? (result.nextCursor ?? undefined) : undefined
	} while (cursor)
	return keyIds
}

async function orderDotcomTranslations(lokaliseApi: LokaliseApi, projectId: string) {
	const teamId = getEnv('LOKALISE_TEAM_ID')
	const cardId = getEnv('LOKALISE_CARD_ID')

	const targetLanguageIsos = await listTargetLanguageIsos(lokaliseApi, projectId)
	const allProjectUntranslatedKeys = await listUntranslatedKeyIds(lokaliseApi, projectId)

	if (!allProjectUntranslatedKeys.length) {
		console.log('No new strings to translate.')
		return
	}

	console.log(
		`Found ${allProjectUntranslatedKeys.length} untranslated key(s) across ${targetLanguageIsos.length} language(s).`
	)

	const orderDetails = {
		project_id: projectId,
		payment_method: 'credit_card' as const,
		card_id: String(cardId),
		briefing: 'Please translate the following keys',
		source_language_iso: 'en',
		target_language_isos: targetLanguageIsos,
		keys: allProjectUntranslatedKeys,
		provider_slug: 'google',
		translation_tier: 1,
	}

	console.log('Placing test order for new strings...')
	const placeTranslationOrderDryRun = await lokaliseApi.orders().create(
		{
			...orderDetails,
			dry_run: true,
		},
		{
			team_id: teamId,
		}
	)

	// Lokalise won't accept an order that prices out at 0, so there's nothing to
	// place here. Log enough to diagnose it: the usual cause is that the keys are
	// untranslated but not billable (already covered by translation memory, or
	// sitting in an open order from a previous run).
	if (placeTranslationOrderDryRun.total === 0) {
		console.log(
			`There are strings to translate but the dry run priced them at 0, so Lokalise won't take the order.`
		)
		console.log(
			`  Untranslated keys (${allProjectUntranslatedKeys.length}): ${allProjectUntranslatedKeys.join(', ')}`
		)
		console.log(
			`  Target languages (${targetLanguageIsos.length}): ${targetLanguageIsos.join(', ')}`
		)
		console.log(`  Dry run response: ${JSON.stringify(placeTranslationOrderDryRun, null, 2)}`)
		console.log('Place the order manually in Lokalise if these strings need translating.')
		return
	}

	if (placeTranslationOrderDryRun.total > MAX_ORDER_TOTAL) {
		console.error(
			`Cost of translations (${placeTranslationOrderDryRun.total}) is exceeding expectations (${MAX_ORDER_TOTAL}). Place a manual order.`
		)
		process.exit(1)
	}

	console.log(
		`Placing actual order for new strings (total: ${placeTranslationOrderDryRun.total})...`
	)
	await lokaliseApi.orders().create(
		{
			...orderDetails,
		},
		{
			team_id: teamId,
		}
	)
	console.log('Finished placing order for new strings.')
}

async function i18nUploadStrings() {
	const lokaliseApi = new LokaliseApi({ apiKey: getEnv('LOKALISE_API_TOKEN') })
	const dotcomProjectId = getEnv('LOKALISE_PROJECT_ID')
	const tldrawProjectId = getEnv('LOKALISE_TLDRAW_PROJECT_ID')

	await uploadFile(lokaliseApi, {
		projectId: dotcomProjectId,
		filePath: path.resolve(__dirname, '../../apps/dotcom/client/public/tla/locales/en.json'),
		filename: 'en.json',
		cleanupMode: true,
	})
	await orderDotcomTranslations(lokaliseApi, dotcomProjectId)

	// The SDK project has no automated ordering — uploading keeps its source
	// strings current so a manual order can pick them up. It runs last so a
	// problem here can't stop the dotcom half of the pipeline.
	// Cleanup mode deletes keys missing from the uploaded file, which is what
	// keeps the project matching main.json. Both projects export with
	// original_filenames, and i18n-download-strings.ts maps every file in a
	// locale's folder to the same <locale>.json, so a stray file here doesn't
	// show up as extra keys — it silently overwrites a locale's real strings
	// depending on export order.
	await uploadFile(lokaliseApi, {
		projectId: tldrawProjectId,
		filePath: path.resolve(__dirname, '../../assets/translations/main.json'),
		filename: 'main.json',
		cleanupMode: true,
	})
}

i18nUploadStrings().catch((error) => {
	console.error('Failed to upload i18n strings:')
	console.error(formatError(error))
	process.exit(1)
})
