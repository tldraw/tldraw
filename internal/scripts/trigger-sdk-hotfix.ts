import kleur from 'kleur'
import { Octokit } from 'octokit'
import * as semver from 'semver'
import { formatDiff, getAnyPackageDiff } from './lib/didAnyPackageChange'
import { Discord } from './lib/discord'
import { exec } from './lib/exec'
import { makeEnv } from './lib/makeEnv'
import { nicelog } from './lib/nicelog'

async function main() {
	const env = makeEnv([
		'DISCORD_DEPLOY_WEBHOOK_URL',
		'GITHUB_TOKEN',
		// bemo URL is needed when building packages, which in this file
		// happens during docs-only mode when we need to check for sdk changes.
		// See the file
		'TLDRAW_BEMO_URL',
	])

	const lastCommitMessage = (await exec('git', ['log', '-1', '--oneline'])).trim()
	const lastPRNumber = lastCommitMessage.match(/\(#(\d+)\)$/)?.[1]
	if (!lastPRNumber) {
		nicelog('No PR number found in last commit message. Exiting...')
		return
	}

	const prNumber = parseInt(lastPRNumber)

	const octokit = new Octokit({ auth: env.GITHUB_TOKEN })

	nicelog(`Checking PR ${prNumber} labels...`)
	const pr = await octokit.rest.pulls.get({
		owner: 'tldraw',
		repo: 'tldraw',
		pull_number: prNumber,
	})

	const docsHotfixPlease = pr.data.labels.find((label) => label.name === 'docs-hotfix-please')
	const sdkHotfixPlease = pr.data.labels.find((label) => label.name === 'sdk-hotfix-please')

	if (!docsHotfixPlease && !sdkHotfixPlease) {
		nicelog('No "(docs|sdk)-hotfix-please" label found. Exiting...')
		return
	}

	nicelog(`Found "${sdkHotfixPlease || docsHotfixPlease}" label. Proceeding...`)

	const isDocsOnly = docsHotfixPlease && !sdkHotfixPlease

	// first cherry-pick HEAD on top of latest release branch
	const latestFullReleaseVersion = (await exec('npm', ['show', 'tldraw', 'version']))
		.trim()
		.split(/\n/g)
		.pop()

	nicelog('Latest tldraw version on npm is', latestFullReleaseVersion)
	const version = semver.parse(latestFullReleaseVersion)
	if (!version) {
		throw new Error(
			`Couldn't get latest tldraw package version from npm: '${latestFullReleaseVersion}'`
		)
	}

	const latestReleaseBranch = `v${version.major}.${version.minor}.x`
	nicelog('Latest release branch', latestReleaseBranch)

	// cherry-pick HEAD on top of latest release branch
	const HEAD = (await exec('git', ['rev-parse', 'HEAD'])).trim()
	await exec('git', ['fetch', 'origin', latestReleaseBranch])
	await exec('git', ['checkout', latestReleaseBranch])
	await exec('git', ['reset', `origin/${latestReleaseBranch}`, '--hard'])
	await exec('git', ['log', '-1', '--oneline'])
	await exec('git', ['cherry-pick', HEAD])

	if (isDocsOnly) {
		nicelog('Ensuring no SDK changes are present...')
		// run yarn again before building packages to make sure everything is ready
		// in case HEAD included dev dependency changes
		await exec('yarn', ['install'])

		const diff = await getAnyPackageDiff()
		if (diff) {
			let message = kleur.red().bold(`・ERROR・`)
			message += `\nCannot cherry-pick docs changes from PR '${kleur.cyan().bold(pr.data.title)}' https://github.com/tldraw/tldraw/pulls/${prNumber}`
			message += '\nThis PR contains changes to the SDK.\n\n'
			let formattedDiff = formatDiff(diff)
			// truncate long diffs for discord's sake, it's not that valuable to see the whole thing
			if (formattedDiff.length > 1000) {
				formattedDiff = formattedDiff.slice(0, 1000) + '\n...\n'
			}
			message += formattedDiff

			message += '\n💡 Please cherry-pick this PR manually and remove the sdk changes.'
			message +=
				'\n   Or apply the sdk-hotfix-please PR label and rerun this action to publish the sdk changes if appropriate.'

			throw new Error(message)
		}
	} else {
		nicelog('Running tests against PR branch...')
		await exec('yarn', ['test'])
	}

	nicelog('Pushing to release branch')
	// return
	await exec('git', ['push', 'origin', `HEAD:${latestReleaseBranch}`])
}

main().catch(async (e: Error) => {
	console.error(e)

	const discord = new Discord({
		webhookUrl: process.env.DISCORD_DEPLOY_WEBHOOK_URL!,
		totalSteps: 8,
		shouldNotify: true,
	})

	await discord
		.message(
			`❌ **Error triggering SDK hotfix on PR ${process.env.PR_NUMBER}**\n\n\`\`\`ansi\n${e.message.slice(0, 2000)}\n\`\`\``
		)
		.finally(() => {
			process.exit(1)
		})
})
