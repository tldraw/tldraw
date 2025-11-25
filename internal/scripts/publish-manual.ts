import { appendFileSync } from 'fs'
import { parse } from 'semver'
import { makeEnv } from './lib/makeEnv'
import {
	getLatestTldrawVersionFromNpm,
	publish,
	publishProductionDocsAndExamplesAndBemo,
	setAllVersions,
} from './lib/publishing'
import { uploadStaticAssets } from './lib/upload-static-assets'

const env = makeEnv(['TLDRAW_VERSION_STRING'])

// Generate a npm automation token and run this with the NPM_TOKEN env var set.
async function main() {
	const latestVersion = await getLatestTldrawVersionFromNpm()
	const version = parse(env.TLDRAW_VERSION_STRING)
	if (!version) throw new Error('Invalid version')

	const isLatestVersion = version.compare(latestVersion) >= 0 && !version.prerelease.length
	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(process.env.GITHUB_OUTPUT, `is_latest_version=${isLatestVersion}\n`)
	}

	await setAllVersions(env.TLDRAW_VERSION_STRING)

	await uploadStaticAssets(env.TLDRAW_VERSION_STRING)

	await publish()

	if (isLatestVersion) {
		await publishProductionDocsAndExamplesAndBemo()
	}
}

main()
