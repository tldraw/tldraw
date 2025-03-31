import { LokaliseApi } from '@lokalise/node-api'
import fs from 'fs'
import path from 'path'

async function i18nUploadStrings() {
	const projectId = process.env.LOKALISE_PROJECT_ID!
	const teamId = process.env.LOKALISE_TEAM_ID!
	const cardId = process.env.LOKALISE_CARD_ID!
	const filePath = path.resolve(__dirname, '../../apps/dotcom/client/public/tla/locales/en.json')
	const file = fs.readFileSync(filePath, 'utf8')
	console.log('Uploading files...')

	const lokaliseApi = new LokaliseApi({ apiKey: process.env.LOKALISE_API_TOKEN })
	const uploadResult = await lokaliseApi.files().upload(projectId, {
		data: Buffer.from(file).toString('base64'),
		filename: 'en.json',
		lang_iso: 'en',
		detect_icu_plurals: true,
		cleanup_mode: true,
	})
	if (uploadResult.status === 'queued') {
		console.log('Uploaded files successfully!')
	} else {
		console.error('Failed to upload files:', uploadResult)
		process.exit(1)
	}

	const targetLanguageIsos = (await lokaliseApi.languages().list({ project_id: projectId })).items
		.map((item) => item.lang_iso)
		.filter((lang) => lang !== 'en')
	const allProjectUntranslatedKeys = (
		await lokaliseApi.keys().list({
			project_id: projectId,
			filter_untranslated: 1,
		})
	).items.map((item) => item.key_id)

	if (!allProjectUntranslatedKeys.length) {
		console.log('No new strings to translate.')
		return
	}

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

	if (placeTranslationOrderDryRun.total === 0) {
		console.log(`There are strings to translate but Lokalise can't do the order b/c it's 0. UGH.`)
		return
	}

	if (placeTranslationOrderDryRun.total > 10) {
		console.error('Cost of translations is exceeding expectations. Place a manual order.')
		process.exit(1)
	}

	console.log('Placing actual order for new strings...')
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

i18nUploadStrings().catch((e) => {
	console.error(e)
	process.exit(1)
})
