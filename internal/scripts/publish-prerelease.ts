import { exec } from './lib/exec'
import { getLatestTldrawVersionFromNpm, publish, setAllVersions } from './lib/publishing'
import { uploadStaticAssets } from './lib/upload-static-assets'

async function main(releaseTag: string) {
	const sha = (await exec('git', ['rev-parse', 'HEAD'])).trim().slice(0, 12)

	const latestVersion = await getLatestTldrawVersionFromNpm()

	const nextVersion = latestVersion.prerelease.length
		? // if the package is in prerelease mode, we want to release a canary for the current version rather than bumping
			latestVersion
		: latestVersion?.inc('minor')

	const versionString = `${nextVersion.major}.${nextVersion.minor}.${nextVersion.patch}-${releaseTag}.${sha}`

	await setAllVersions(versionString)
	await uploadStaticAssets(versionString)
	await publish(releaseTag)
}

const args = process.argv.slice(2)
if (args.length === 0) {
	throw new Error('Usage: publish-prerelease.ts <releaseTag>')
}
const releaseTag = args[0]
if (releaseTag !== 'canary' && releaseTag !== 'internal' && releaseTag !== 'next') {
	throw new Error('releaseTag must be "canary", "internal", or "next"')
}
main(releaseTag)
