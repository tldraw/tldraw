import { LokaliseApi } from '@lokalise/node-api'
import fs from 'fs'
import path from 'path'

async function i18nUploadStrings() {
	const projectId = process.env.LOKALISE_PROJECT_ID!
	const filePath = path.resolve(__dirname, '../../apps/dotcom/client/public/tla/locales/en.json')
	const file = fs.readFileSync(filePath, 'utf8')
	console.log('Uploading files...')

	const lokaliseApi = new LokaliseApi({ apiKey: process.env.LOKALISE_API_KEY })
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
}

i18nUploadStrings()
