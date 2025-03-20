import { LokaliseApi } from '@lokalise/node-api'
import fs from 'fs'
import JSZip from 'jszip'
import path from 'path'

async function fetchAndSave(
	url: string,
	dirPath: string,
	sortJson: boolean,
	fileResolver: (fileName: string) => string,
	space: string | number,
	skipEnglish = false
) {
	const bundleZip = await fetch(url)
	// Need to unzip the bundle
	const zipData = await bundleZip.arrayBuffer()
	const zip = new JSZip()
	const bundle = await zip.loadAsync(zipData)
	const locales = Object.keys(bundle.files)
	for (const locale of locales) {
		if (bundle.files[locale].dir) {
			continue
		}
		const fileName = fileResolver(bundle.files[locale].name)
		if (skipEnglish && fileName === 'en.json') {
			continue
		}
		const filePath = path.resolve(dirPath, fileName)
		const file = await bundle.files[locale].async('text')
		const json = JSON.parse(file)

		let finalJson = json
		if (sortJson) {
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
			finalJson = sortedJson
		}
		fs.writeFileSync(filePath, JSON.stringify(finalJson, null, space) + '\n')
		console.log(`Wrote ${filePath}`)
	}
}

async function i18nDownloadStrings() {
	await i18nDownloadTldrawStrings()
	await i18nDownloadDotcomStrings()
}

async function i18nDownloadTldrawStrings() {
	const projectId = process.env.LOKALISE_TLDRAW_PROJECT_ID!
	const dirPath = path.resolve(__dirname, '../../assets/translations')
	console.log('Downloading tldraw project files...')

	const lokaliseApi = new LokaliseApi({ apiKey: process.env.LOKALISE_API_TOKEN })
	const downloadResult = await lokaliseApi.files().download(projectId, {
		format: 'json',
		original_filenames: true,
		export_empty_as: 'skip',
	})

	if (!downloadResult.bundle_url) {
		console.error('Failed to download files:', downloadResult)
		process.exit(1)
		return
	}

	await fetchAndSave(
		downloadResult.bundle_url,
		dirPath,
		false /* sort json */,
		(fileName) => fileName.split('/')[0].replace('_', '-').toLowerCase() + '.json',
		'\t',
		true /* skip english */
	)

	console.log('Downloaded files successfully!')
}

async function i18nDownloadDotcomStrings() {
	const projectId = process.env.LOKALISE_PROJECT_ID!
	const dirPath = path.resolve(__dirname, '../../apps/dotcom/client/public/tla/locales')
	console.log('Downloading dotcom project files...')

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
		console.error('Failed to download files:', downloadResult)
		process.exit(1)
		return
	}

	await fetchAndSave(
		downloadResult.bundle_url,
		dirPath,
		true /* sort json */,
		(fileName) => fileName.split('/')[1].replace('_', '-').toLowerCase(),
		2
	)

	console.log('Downloaded files successfully!')
}

i18nDownloadStrings()
