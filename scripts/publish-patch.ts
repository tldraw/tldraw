import { Auto } from '@auto-it/core'
import fetch from 'cross-fetch'
import glob from 'glob'
import { assert } from 'node:console'
import { appendFileSync } from 'node:fs'
import { didAnyPackageChange } from './lib/didAnyPackageChange'
import { exec } from './lib/exec'
import { generateAutoRcFile } from './lib/labels'
import { nicelog } from './lib/nicelog'
import { getLatestVersion, publish, setAllVersions } from './lib/publishing'
import { getAllWorkspacePackages } from './lib/workspace'

async function main() {
	const huppyToken = process.env.HUPPY_TOKEN
	assert(huppyToken && typeof huppyToken === 'string', 'HUPPY_ACCESS_KEY env var must be set')

	const latestVersionInBranch = await getLatestVersion()
	const latestVersionOnNpm = (await exec('npm', ['show', 'tldraw', 'version'])).trim()

	const isLatestVersion = latestVersionInBranch.format() === latestVersionOnNpm

	const nextVersion = latestVersionInBranch.inc('patch').format()
	// check we're on the main branch on HEAD
	const currentBranch = (await exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'])).toString().trim()
	if (currentBranch !== `v${latestVersionInBranch.major}.${latestVersionInBranch.minor}.x`) {
		throw new Error('Branch name does not match expected format: v{major}.{minor}.x')
	}

	// we could probably do this a lot earlier in the yml file but 🤷‍♂️
	await exec('git', ['fetch', 'origin', 'main'])
	const numberOfCommitsSinceBranch = Number(
		(await exec('git', ['rev-list', '--count', `HEAD`, '^origin/main'])).toString().trim()
	)

	if (numberOfCommitsSinceBranch === 0) {
		// Skip release if there are no commits since this branch was created during the initial release
		// for this <major>.<minor> version.
		nicelog('Initial push, skipping release')
		return
	}

	if (isLatestVersion) {
		await exec('git', ['push', 'origin', `HEAD:docs-production`, '--force'])
	}

	// Skip releasing a new version if the package contents are identical.
	// This may happen when cherry-picking docs-only changes.
	if (!(await didAnyPackageChange())) {
		nicelog('No packages have changed, skipping release')
		return
	}

	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(process.env.GITHUB_OUTPUT, `is_latest_version=${isLatestVersion}\n`)
	}

	nicelog('Releasing version', nextVersion)

	await setAllVersions(nextVersion)

	// stage the changes
	const packageJsonFilesToAdd = []
	for (const workspace of await getAllWorkspacePackages()) {
		if (workspace.relativePath.startsWith('packages/')) {
			packageJsonFilesToAdd.push(`${workspace.relativePath}/package.json`)
		}
	}
	const versionFilesToAdd = glob.sync('**/*/version.ts', {
		ignore: ['node_modules/**'],
		follow: false,
	})
	console.log('versionFilesToAdd', versionFilesToAdd)
	await exec('git', [
		'add',
		'--update',
		'lerna.json',
		...packageJsonFilesToAdd,
		...versionFilesToAdd,
	])

	const auto = new Auto({
		plugins: ['npm'],
		baseBranch: currentBranch,
		owner: 'tldraw',
		repo: 'tldraw',
		verbose: true,
		disableTsNode: true,
	})

	await generateAutoRcFile()
	await auto.loadConfig()

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

	// if we're on the latest version, publish to npm under 'latest' tag.
	// otherwise we don't want to overwrite the latest tag, so we publish under 'revision'.
	// semver rules will still be respected because there's no prerelease tag in the version,
	// so clients will get the updated version if they have a range like ^1.0.0
	await publish(isLatestVersion ? 'latest' : 'revision')

	if (isLatestVersion) {
		nicelog('Notifying huppy of release...')
		const huppyResponse = await fetch('https://tldraw-repo-sync.fly.dev/api/on-release', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ apiKey: huppyToken, tagToRelease: `v${nextVersion}`, canary: false }),
		})
		nicelog(
			`huppy: [${huppyResponse.status} ${huppyResponse.statusText}] ${await huppyResponse.text()}`
		)
	}
}

main()
