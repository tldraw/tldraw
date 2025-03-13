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
		'PR_NUMBER',
		'GITHUB_TOKEN',
		'TLDRAW_BEMO_URL',
	])

	const prNumber = parseInt(env.PR_NUMBER)

	const octokit = new Octokit({
		auth: env.GITHUB_TOKEN,
	})
	nicelog(`Checking PR ${prNumber} for "docs-hotfix-please" label...`)
	const pr = await octokit.rest.pulls.get({
		owner: 'tldraw',
		repo: 'tldraw',
		pull_number: prNumber,
	})

	// look for 'docs-hotfix-please' label
	const docsHotfixPlease = pr.data.labels.find((label) => label.name === 'docs-hotfix-please')
	const sdkHotfixPlease = pr.data.labels.find((label) => label.name === 'sdk-hotfix-please')
	if (!docsHotfixPlease && !sdkHotfixPlease) {
		nicelog('No "(docs|sdk)-hotfix-please" label found. Exiting...')
		return
	}
	const isDocsOnly = docsHotfixPlease && !sdkHotfixPlease

	nicelog(`Found "${sdkHotfixPlease || docsHotfixPlease}" label. Proceeding...`)

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

	if (isDocsOnly) {
		nicelog('Ensuring no SDK changes are present...')
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
			message += formatDiff(diff).slice(0, 1000)

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
