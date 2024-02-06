import { exec } from './lib/exec'
import { nicelog } from './lib/nicelog'
import { getLatestVersion, publish, setAllVersions } from './lib/publishing'

async function main() {
	const sha = (await exec('git', ['rev-parse', 'HEAD'])).trim().slice(0, 12)

	async function setCanaryVersions(bump: 'major' | 'minor' | 'patch') {
		const latestVersion = getLatestVersion()

		const nextVersion = latestVersion.prerelease.length
			? // if the package is in prerelease mode, we want to release a canary for the current version rather than bumping
			  latestVersion
			: latestVersion?.inc(bump)
		const versionString = `${nextVersion.major}.${nextVersion.minor}.${nextVersion.patch}-canary.${sha}`

		setAllVersions(versionString)
	}

	// module was called directly
	const bumpType = (await exec('npx', ['auto', 'version'])).trim() as
		| 'major'
		| 'minor'
		| 'patch'
		| ''

	nicelog('bumpType', bumpType)
	if (bumpType === '') {
		nicelog('nothing to do')
	} else if (['major', 'minor', 'patch'].includes(bumpType)) {
		nicelog('setting canary versions')
		setCanaryVersions(bumpType)
		publish()
	} else {
		throw new Error('Invalid bump type provided')
	}
}

main()
