import { Octokit } from 'octokit'
import * as semver from 'semver'
import { didAnyPackageChange } from './lib/didAnyPackageChange'
import { exec } from './lib/exec'
import { nicelog } from './lib/nicelog'

const PR_NUMBER = process.env.PR_NUMBER
if (!PR_NUMBER) {
	// ignore direct pushes to main
	nicelog('No PR_NUMBER env var found, exiting...')
	process.exit(0)
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
if (!GITHUB_TOKEN) {
	throw new Error('GITHUB_TOKEN env var is required')
}

const prNumber = parseInt(PR_NUMBER)

const octokit = new Octokit({
	auth: GITHUB_TOKEN,
})

async function main() {
	nicelog(`Checking PR ${prNumber} for "docs-hotfix-please" label...`)
	const pr = await octokit.rest.pulls.get({
		owner: 'tldraw',
		repo: 'tldraw',
		pull_number: prNumber,
	})

	// look for 'docs-hotfix-please' label
	const docsHotfixPlease = pr.data.labels.find((label) => label.name === 'docs-hotfix-please')
	if (!docsHotfixPlease) {
		nicelog('No "docs-hotfix-please" label found. Exiting...')
		return
	}
	nicelog('Found "docs-hotfix-please" label.')
	nicelog('Ensuring no sdk changes')

	// first cherry-pick on top of latest release branch
	const HEAD = (await exec('git', ['rev-parse', 'HEAD'])).trim()

	const latestOnNpm = (await exec('npm', ['show', 'tldraw', 'version'])).trim().split(/\n/g).pop()
	nicelog('latestOnNpm', latestOnNpm)
	const version = semver.parse(latestOnNpm)
	if (!version) {
		throw new Error(`Invalid version ${latestOnNpm}`)
	}

	const latestReleaseBranch = `v${version.major}.${version.minor}.x`
	nicelog('latest release branch', latestReleaseBranch)

	await exec('git', ['fetch', 'origin', latestReleaseBranch])
	await exec('git', ['checkout', latestReleaseBranch])

	// cherry-pick
	await exec('git', ['cherry-pick', HEAD])

	await exec('yarn', ['install'])

	if (await didAnyPackageChange()) {
		throw new Error('SDK changes detected, please cherry-pick docs changes only')
	}

	nicelog('No SDK changes detected, pushing to release branch')
	// return
	await exec('git', ['push', 'origin', latestReleaseBranch])
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
