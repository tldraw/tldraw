import { Octokit } from '@octokit/rest'
import assert from 'assert'
import minimist from 'minimist'
import { SemVer, parse } from 'semver'
import { exec } from './lib/exec'
import { makeEnv } from './lib/makeEnv'
import { nicelog } from './lib/nicelog'
import {
	getLatestTldrawVersionFromNpm,
	publish,
	publishProductionDocsAndExamplesAndBemo,
	setAllVersions,
	triggerBumpVersionsWorkflow,
} from './lib/publishing'
import { uploadStaticAssets } from './lib/upload-static-assets'

const env = makeEnv(['GH_TOKEN'])

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

async function getDraftRelease(version: string, octokit: Octokit) {
	const expectedVersion = `v${version}`

	// Fetch all releases with pagination
	const releases = await octokit.paginate(octokit.rest.repos.listReleases, {
		owner: 'tldraw',
		repo: 'tldraw',
		per_page: 100, // Maximum per page to reduce API calls
	})

	const draftRelease = releases.find((release) => release.draft && release.name === expectedVersion)

	if (!draftRelease) {
		const availableDrafts = releases
			.filter((r) => r.draft)
			.map((r) => r.name)
			.join(', ')
		throw new Error(
			`No draft release found named ${expectedVersion}. Available draft releases: ${availableDrafts || 'none'}`
		)
	}

	assert(draftRelease.body, `Draft release ${expectedVersion} has no body/release notes`)
	return draftRelease
}

async function getNextVersion(releaseType: ReleaseType): Promise<string> {
	if (releaseType.bump === 'override') {
		return releaseType.version.format()
	}

	const latestVersion = await getLatestTldrawVersionFromNpm()

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
	// // check we're on the main branch on HEAD
	const currentBranch = (await exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'])).toString().trim()
	if (currentBranch !== 'production') {
		throw new Error('Must be on production branch to publish')
	}

	const releaseType = getReleaseType()
	const nextVersion = await getNextVersion(releaseType)

	const isPrerelease = parse(nextVersion)!.prerelease.length > 0
	assert(!isPrerelease, 'Prerelease versions are no longer supported for new releases')

	console.log('Releasing version', nextVersion)

	// Check that a draft release exists early, before doing any work
	const octokit = new Octokit({ auth: env.GH_TOKEN })
	const draftRelease = await getDraftRelease(nextVersion, octokit)
	nicelog('Found draft release:', draftRelease)

	await setAllVersions(nextVersion, { stageChanges: true })

	const gitTag = `v${nextVersion}`
	await exec('git', ['commit', '-m', `${gitTag}`])

	// create new 'release' branch called e.g. v2.0.x or v4.3.x, for making patch releases
	const { major, minor } = parse(nextVersion)!
	const branchName = `v${major}.${minor}.x`
	// create and push a new tag to the release branch
	await exec('git', ['tag', '-a', gitTag, '-m', gitTag, '-f'])
	await exec('git', ['push', 'origin', `${gitTag}:refs/heads/${branchName}`])
	await exec('git', ['push', 'origin', 'tag', gitTag, '-f'])
	await publishProductionDocsAndExamplesAndBemo()

	// convert draft release to published release
	await octokit.rest.repos.updateRelease({
		owner: 'tldraw',
		repo: 'tldraw',
		release_id: draftRelease.id,
		draft: false,
		tag_name: gitTag,
		name: gitTag,
	})

	// upload static assets
	await uploadStaticAssets(nextVersion)

	// finally, publish the packages [IF THIS STEP FAILS, RUN THE `publish-manual.ts` script locally]
	await publish()

	// Trigger version bump on main branch to sync all package versions
	nicelog('Triggering version bump on main branch')
	await triggerBumpVersionsWorkflow(env.GH_TOKEN)
}

main()
