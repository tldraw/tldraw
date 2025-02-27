import { LokaliseApi } from '@lokalise/node-api'
import fs from 'fs'
import JSZip from 'jszip'
import path from 'path'

async function i18nDownloadStrings() {
	const projectId = process.env.LOKALISE_PROJECT_ID!
	const dirPath = path.resolve(__dirname, '../../apps/dotcom/client/public/tla/locales')
	console.log('Downloading files...')

	const lokaliseApi = new LokaliseApi({ apiKey: process.env.LOKALISE_API_TOKEN })
	const downloadResult = await lokaliseApi.files().download(projectId, {
		format: 'json_structured',
		original_filenames: true,
		include_comments: true,
		include_description: true,
		export_empty_as: 'skip',
		plural_format: 'icu',
		placeholder_format: 'icu',
	})

	if (!downloadResult.bundle_url) {
		console.error('Failed to upload files:', downloadResult)
		process.exit(1)
		return
	}

	const bundleZip = await fetch(downloadResult.bundle_url)
	// Need to unzip the bundle
	const zipData = await bundleZip.arrayBuffer()
	const zip = new JSZip()
	const bundle = await zip.loadAsync(zipData)
	const locales = Object.keys(bundle.files)
	for (const locale of locales) {
		if (bundle.files[locale].dir) {
			continue
		}
		const fileName = bundle.files[locale].name.split('/')[1].replace('_', '-').toLowerCase()
		const filePath = path.resolve(dirPath, fileName)
		const file = await bundle.files[locale].async('text')
		const json = JSON.parse(file)
		// Sort of annoying, the property order is not guaranteed, so we need to alphabetize the keys.
		const sortedJson: { [key: string]: Record<string, string> } = {}
		// We have to go into the subobject to sort the keys.
		for (const key of Object.keys(json)) {
			const subJson = json[key]
			const sortedSubJson: Record<string, string> = {}
			for (const subKey of Object.keys(subJson).sort()) {
				sortedSubJson[subKey] = subJson[subKey]
			}
			sortedJson[key] = sortedSubJson
		}
		fs.writeFileSync(filePath, JSON.stringify(sortedJson, null, 2) + '\n')
		console.log(`Wrote ${filePath}`)
	}
	console.log('Downloaded files successfully!')
}

i18nDownloadStrings()
