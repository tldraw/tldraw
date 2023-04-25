import { execSync } from 'child_process'
import { pathToFileURL } from 'url'
import { getLatestVersion, publish, setAllVersions } from './lib/publishing'

const sha = execSync('git rev-parse --short HEAD').toString().trim()

async function setCanaryVersions(bump: 'major' | 'minor' | 'patch') {
	const latestVersion = getLatestVersion()

	const nextVersion = latestVersion.prerelease.length
		? // if the package is in prerelease mode, we want to release a canary for the current version rather than bumping
		  latestVersion
		: latestVersion?.inc(bump)
	const versionString = `${nextVersion.major}.${nextVersion.minor}.${nextVersion.patch}-canary.${sha}`

	setAllVersions(versionString)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	// module was called directly
	const bumpType = execSync('auto version').toString().trim() as 'major' | 'minor' | 'patch' | ''

	console.log('bumpType', bumpType)
	if (bumpType === '') {
		console.log('nothing to do')
	} else if (['major', 'minor', 'patch'].includes(bumpType)) {
		console.log('setting canary versions')
		setCanaryVersions(bumpType)
		publish()
	} else {
		throw new Error('Invalid bump type provided')
	}
}
