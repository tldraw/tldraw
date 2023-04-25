import { Auto } from '@auto-it/core'
import { execSync } from 'child_process'
import { parse } from 'semver'
import { pathToFileURL } from 'url'
import { getLatestVersion, publish, setAllVersions } from './lib/publishing'

const auto = new Auto({
	plugins: ['npm'],
	baseBranch: 'main',
	owner: 'tldraw',
	repo: 'tldraw-lite',
	verbose: true,
})

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	// module was called directly
	const currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
	if (currentBranch !== 'main') {
		throw new Error('Must be on main branch to publish')
	}

	;(async () => {
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
			throw new Error(
				`Invalid prerelease format in version ${latestVersion}, expected e.g. -alpha.1`
			)
		}

		// if we're in prerelease mode, don't bump the version, only the prerelease number
		const nextVersion = prereleaseTag
			? `${latestVersion.major}.${latestVersion.minor}.${latestVersion.patch}-${prereleaseTag}.${
					Number(prereleaseNumber) + 1
			  }`
			: latestVersion.inc(bump).format()

		setAllVersions(nextVersion)

		// stage the changes
		execSync('git add lerna.json bublic/packages/*/package.json', { stdio: 'inherit' })

		// this creates a new commit
		await auto.changelog({
			useVersion: nextVersion,
			title: `v${nextVersion}`,
		})

		// create and push a new tag
		execSync(`git tag -f v${nextVersion}`, { stdio: 'inherit' })
		execSync('git push --follow-tags', { stdio: 'inherit' })

		// create a release on github
		await auto.runRelease({ useVersion: nextVersion })

		// finally, publish the packages [IF THIS STEP FAILS, RUN THE `publish-manual.ts` script locally]
		await publish()
	})()
}
