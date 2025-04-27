import { Auto } from '@auto-it/core'
import glob from 'glob'
import minimist from 'minimist'
import { assert } from 'node:console'
import { SemVer, parse } from 'semver'
import { exec } from './lib/exec'
import { generateAutoRcFile } from './lib/labels'
import { nicelog } from './lib/nicelog'
import {
	getLatestVersion,
	publish,
	publishProductionDocsAndExamplesAndBemo,
	setAllVersions,
} from './lib/publishing'
import { uploadStaticAssets } from './lib/upload-static-assets'
import { getAllWorkspacePackages } from './lib/workspace'

type ReleaseType =
	| {
			bump: 'major' | 'minor'
	  }
	| {
			bump: 'override'
			version: SemVer
	  }

function getReleaseType(): ReleaseType {
	const arg = minimist(process.argv.slice(2))['bump']
	if (!arg) {
		throw new Error('Must provide a --bump argument')
	}
	if (arg === 'major' || arg === 'minor') {
		return { bump: arg }
	}
	const parsed = parse(arg)
	if (parsed) {
		return { bump: 'override', version: parsed }
	}
	throw new Error('Invalid bump argument ' + JSON.stringify(arg))
}

async function getNextVersion(releaseType: ReleaseType): Promise<string> {
	if (releaseType.bump === 'override') {
		return releaseType.version.format()
	}

	const latestVersion = parse(await getLatestVersion())!

	nicelog('latestVersion', latestVersion)

	const [prereleaseTag, prereleaseNumber] = latestVersion.prerelease
	if (prereleaseTag && typeof prereleaseNumber !== 'number') {
		throw new Error(`Invalid prerelease format in version ${latestVersion}, expected e.g. -alpha.1`)
	}

	// if we're in prerelease mode, don't bump the version, only the prerelease number
	const nextVersion = prereleaseTag
		? `${latestVersion.major}.${latestVersion.minor}.${latestVersion.patch}-${prereleaseTag}.${
				Number(prereleaseNumber) + 1
			}`
		: latestVersion.inc(releaseType.bump).format()

	return nextVersion
}

async function main() {
	const huppyToken = process.env.HUPPY_TOKEN
	assert(huppyToken && typeof huppyToken === 'string', 'HUPPY_ACCESS_KEY env var must be set')

	// check we're on the main branch on HEAD
	const currentBranch = (await exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'])).toString().trim()
	if (currentBranch !== 'main') {
		throw new Error('Must be on main branch to publish')
	}

	const releaseType = getReleaseType()
	const nextVersion = await getNextVersion(releaseType)

	const isPrerelease = parse(nextVersion)!.prerelease.length > 0

	console.log('Releasing version', nextVersion)

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
		baseBranch: 'main',
		owner: 'tldraw',
		repo: 'tldraw',
		verbose: true,
		disableTsNode: true,
	})

	await generateAutoRcFile()
	await auto.loadConfig()

	const preTagRef = (await exec('git', ['rev-parse', 'HEAD'])).trim()

	// this creates a new commit
	await auto.changelog({
		useVersion: nextVersion,
		title: `v${nextVersion}`,
	})

	const gitTag = `v${nextVersion}`

	// create and push a new tag
	await exec('git', ['tag', '-f', gitTag])
	await exec('git', ['push', '--follow-tags'])

	// create new 'release' branch called e.g. v2.0.x or v4.3.x, for making patch releases
	if (!isPrerelease) {
		const { major, minor } = parse(nextVersion)!
		await exec('git', ['push', 'origin', `${gitTag}:refs/heads/v${major}.${minor}.x`])
		await publishProductionDocsAndExamplesAndBemo({
			// we use the ref from the HEAD before we created the tag, because auto
			// adds `[skip ci]` to the commit message when it creates the changelog, and
			// that will prevent the bemo release from going out.
			gitRef: preTagRef,
		})
	}

	// create a release on github
	await auto.runRelease({ useVersion: nextVersion })

	// upload static assets
	await uploadStaticAssets(nextVersion)

	// finally, publish the packages [IF THIS STEP FAILS, RUN THE `publish-manual.ts` script locally]
	await publish()
}

main()
