import { exec } from './lib/exec'
import { getLatestVersion, publish, setAllVersions } from './lib/publishing'
import { uploadStaticAssets } from './upload-static-assets'

async function main() {
	const sha = (await exec('git', ['rev-parse', 'HEAD'])).trim().slice(0, 12)

	async function setCanaryVersions() {
		const latestVersion = await getLatestVersion()

		const nextVersion = latestVersion.prerelease.length
			? // if the package is in prerelease mode, we want to release a canary for the current version rather than bumping
				latestVersion
			: latestVersion?.inc('minor')
		const versionString = `${nextVersion.major}.${nextVersion.minor}.${nextVersion.patch}-canary.${sha}`

		await setAllVersions(versionString)
		return versionString
	}

	// module was called directly

	const versionString = await setCanaryVersions()
	await uploadStaticAssets(versionString)
	await publish('canary')
}

main()
