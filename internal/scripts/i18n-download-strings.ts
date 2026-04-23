import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'

const LOKALISE_API_BASE = 'https://api.lokalise.com/api2'
const ASYNC_EXPORT_POLL_INTERVAL_MS = 2000
const ASYNC_EXPORT_MAX_POLLS = 120

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

async function lokaliseRequest<T>(path: string, init: RequestInit, apiKey: string): Promise<T> {
	const response = await fetch(`${LOKALISE_API_BASE}${path}`, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			'X-Api-Token': apiKey,
			...(init.headers ?? {}),
		},
	})

	const body = (await response.json()) as unknown
	if (!response.ok) {
		throw new Error(
			`Lokalise request failed (${response.status}): ${JSON.stringify(body, null, 2)}`
		)
	}

	return body as T
}

async function getAsyncBundleUrl(
	projectId: string,
	options: Record<string, unknown>,
	apiKey: string
) {
	const start = await lokaliseRequest<{ process_id?: string }>(
		`/projects/${projectId}/files/async-download`,
		{
			method: 'POST',
			body: JSON.stringify(options),
		},
		apiKey
	)

	if (!start.process_id) {
		throw new Error(`Async export did not return process_id: ${JSON.stringify(start, null, 2)}`)
	}

	for (let i = 0; i < ASYNC_EXPORT_MAX_POLLS; i++) {
		const processResult = await lokaliseRequest<{
			process?: {
				status?: string
				message?: string
				details?: { download_url?: string; bundle_url?: string }
			}
		}>(`/projects/${projectId}/processes/${start.process_id}`, { method: 'GET' }, apiKey)

		const status = processResult.process?.status
		const details = processResult.process?.details
		const bundleUrl = details?.download_url ?? details?.bundle_url

		if (status === 'finished') {
			if (!bundleUrl) {
				throw new Error(
					`Async export finished but no bundle URL was returned: ${JSON.stringify(processResult, null, 2)}`
				)
			}
			return bundleUrl
		}

		if (status === 'failed' || status === 'cancelled') {
			throw new Error(
				`Async export ${status}: ${processResult.process?.message ?? 'No message'}\n${JSON.stringify(processResult, null, 2)}`
			)
		}

		await sleep(ASYNC_EXPORT_POLL_INTERVAL_MS)
	}

	throw new Error(
		`Async export timed out after ${ASYNC_EXPORT_MAX_POLLS} polls for project ${projectId}`
	)
}

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
	const projectId = getEnv('LOKALISE_TLDRAW_PROJECT_ID')
	const apiKey = getEnv('LOKALISE_API_TOKEN')
	const dirPath = path.resolve(__dirname, '../../assets/translations')
	console.log('Downloading tldraw project files...')

	const bundleUrl = await getAsyncBundleUrl(
		projectId,
		{
			format: 'json',
			original_filenames: true,
			export_empty_as: 'skip',
		},
		apiKey
	)

	await fetchAndSave(
		bundleUrl,
		dirPath,
		false /* sort json */,
		(fileName) => fileName.split('/')[0].replace('_', '-').toLowerCase() + '.json',
		'\t',
		true /* skip english */
	)

	console.log('Downloaded files successfully!')
}

async function i18nDownloadDotcomStrings() {
	const projectId = getEnv('LOKALISE_PROJECT_ID')
	const apiKey = getEnv('LOKALISE_API_TOKEN')
	const dirPath = path.resolve(__dirname, '../../apps/dotcom/client/public/tla/locales')
	console.log('Downloading dotcom project files...')

	const bundleUrl = await getAsyncBundleUrl(
		projectId,
		{
			format: 'json_structured',
			original_filenames: true,
			include_comments: true,
			include_description: true,
			export_empty_as: 'skip',
			plural_format: 'icu',
			placeholder_format: 'icu',
		},
		apiKey
	)

	await fetchAndSave(
		bundleUrl,
		dirPath,
		true /* sort json */,
		(fileName) => fileName.split('/')[1].replace('_', '-').toLowerCase(),
		2
	)

	console.log('Downloaded files successfully!')
}

i18nDownloadStrings().catch((error) => {
	console.error('Failed to download i18n strings:')
	console.error(formatError(error))
	process.exit(1)
})
