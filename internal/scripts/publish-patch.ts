import { Auto } from '@auto-it/core'
import { appendFileSync } from 'node:fs'
import { getAnyPackageDiff } from './lib/didAnyPackageChange'
import { exec } from './lib/exec'
import { generateAutoRcFile } from './lib/labels'
import { nicelog } from './lib/nicelog'
import {
	getLatestTldrawVersionFromNpm,
	publish,
	publishProductionDocsAndExamplesAndBemo,
	setAllVersions,
	triggerBumpVersionsWorkflow,
} from './lib/publishing'
import { uploadStaticAssets } from './lib/upload-static-assets'

async function main() {
	const currentBranch = (await exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'])).toString().trim()
	const match = currentBranch.match(/^v(\d+)\.(\d+)\.x$/)
	if (!match) {
		throw new Error('Branch name does not match expected format: v{major}.{minor}.x')
	}
	const [major, minor] = match.slice(1).map(Number)
	const latestVersionInBranch = await getLatestTldrawVersionFromNpm({
		versionPrefix: `${major}.${minor}`,
	})

	// Check if this commit is already tagged with the initial release for this major.minor version
	const expectedInitialTag = `v${latestVersionInBranch.major}.${latestVersionInBranch.minor}.0`
	const tagsAtThisCommit = (await exec('git', ['tag', '--points-at', 'HEAD']))
		.toString()
		.trim()
		.split('\n')

	if (tagsAtThisCommit.includes(expectedInitialTag)) {
		// Skip release if this is the initial release commit for this major.minor version
		nicelog('Initial release commit, skipping patch release')
		return
	} else {
		nicelog('Not an initial release commit, continuing with patch release')
	}

	const latestVersion = await getLatestTldrawVersionFromNpm()
	const isLatestVersion = latestVersion.compare(latestVersionInBranch) === 0

	if (isLatestVersion) {
		await publishProductionDocsAndExamplesAndBemo()
	}

	// Skip releasing a new version if the package contents are identical.
	// This may happen when cherry-picking docs-only changes.
	if (!(await getAnyPackageDiff())) {
		nicelog('No packages have changed, skipping release')
		return
	}

	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(process.env.GITHUB_OUTPUT, `is_latest_version=${isLatestVersion}\n`)
	}

	const nextVersion = latestVersionInBranch.inc('patch').format()
	nicelog('Releasing version', nextVersion)

	await setAllVersions(nextVersion, { stageChanges: true })

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

	const tag = `v${nextVersion}`

	// create and push a new tag
	await exec('git', ['commit', '-m', `${tag} [skip ci]`])
	await exec('git', ['tag', '-f', tag])
	await exec('git', ['push', '--follow-tags'])

	// create a release on github
	await auto.runRelease({ useVersion: nextVersion })

	await uploadStaticAssets(nextVersion)

	// if we're on the latest version, publish to npm under 'latest' tag.
	// otherwise we don't want to overwrite the latest tag, so we publish under 'revision'.
	// semver rules will still be respected because there's no prerelease tag in the version,
	// so clients will get the updated version if they have a range like ^1.0.0
	await publish(isLatestVersion ? 'latest' : 'revision')

	// If this is the latest version, trigger version bump on main branch to sync all package versions
	if (isLatestVersion) {
		nicelog('This is the latest version, triggering version bump on main branch')
		await triggerBumpVersionsWorkflow(process.env.GH_TOKEN!)
	}
}

main()
