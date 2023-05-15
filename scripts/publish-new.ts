import { Auto } from '@auto-it/core'
import { parse } from 'semver'
import { exec } from './lib/exec'
import { getLatestVersion, publish, setAllVersions } from './lib/publishing'

async function main() {
	const auto = new Auto({
		plugins: ['npm'],
		baseBranch: 'main',
		owner: 'tldraw',
		repo: 'tldraw',
		verbose: true,
	})

	// module was called directly
	const currentBranch = (await exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'])).toString().trim()
	if (currentBranch !== 'main') {
		throw new Error('Must be on main branch to publish')
	}

	await auto.loadConfig()
	const bump = await auto.getVersion()
	if (!bump) {
		console.log('nothing to do')
		return
	}

	const latestVersion = parse(getLatestVersion())!

	console.log('latestVersion', latestVersion)

	const [prereleaseTag, prereleaseNumber] = latestVersion.prerelease
	if (prereleaseTag && typeof prereleaseNumber !== 'number') {
		throw new Error(`Invalid prerelease format in version ${latestVersion}, expected e.g. -alpha.1`)
	}

	// if we're in prerelease mode, don't bump the version, only the prerelease number
	const nextVersion = prereleaseTag
		? `${latestVersion.major}.${latestVersion.minor}.${latestVersion.patch}-${prereleaseTag}.${
				Number(prereleaseNumber) + 1
		  }`
		: latestVersion.inc(bump).format()

	setAllVersions(nextVersion)

	// stage the changes
	await exec('git', ['add', 'lerna.json', 'bublic/packages/*/package.json'])

	// this creates a new commit
	await auto.changelog({
		useVersion: nextVersion,
		title: `v${nextVersion}`,
	})

	// create and push a new tag
	await exec('git', ['tag', '-f', `v${nextVersion}`])
	await exec('git', ['push', '--follow-tags'])

	// create a release on github
	await auto.runRelease({ useVersion: nextVersion })

	// finally, publish the packages [IF THIS STEP FAILS, RUN THE `publish-manual.ts` script locally]
	await publish()
}

main()
