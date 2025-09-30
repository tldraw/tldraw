import kleur from 'kleur'
import { Octokit } from 'octokit'
import * as semver from 'semver'
import { formatDiff, getAnyPackageDiff } from './lib/didAnyPackageChange'
import { Discord } from './lib/discord'
import { exec } from './lib/exec'
import { makeEnv } from './lib/makeEnv'
import { nicelog } from './lib/nicelog'
import { getPrDetailsAndCommitSha, labelPresent, PullRequest } from './lib/pr-info'
import { getAllWorkspacePackages } from './lib/workspace'

function getEnv() {
	return makeEnv([
		'DISCORD_DEPLOY_WEBHOOK_URL',
		'GITHUB_TOKEN',
		// bemo URL is needed when building packages, which in this file
		// happens during docs-only mode when we need to check for sdk changes.
		// See the file
		'TLDRAW_BEMO_URL',
	])
}

function getTriggerType(pr: PullRequest): 'none' | 'SDK' | 'docs' {
	nicelog(`Checking PR ${pr.number} labels...`)

	const hasDocsHotfixLabel = labelPresent(pr, 'docs-hotfix-please')
	const hasSdkHotfixLabel = labelPresent(pr, 'sdk-hotfix-please')

	if (!hasDocsHotfixLabel && !hasSdkHotfixLabel) {
		nicelog('No "(docs|sdk)-hotfix-please" label found. Exiting...')
		return 'none'
	}

	nicelog(
		`Found "${hasSdkHotfixLabel ? 'sdk-hotfix-please' : 'docs-hotfix-please'}" label. Proceeding...`
	)

	const isDocsOnly = hasDocsHotfixLabel && !hasSdkHotfixLabel
	return isDocsOnly ? 'docs' : 'SDK'
}

async function main() {
	const env = getEnv()
	const octokit = new Octokit({ auth: env.GITHUB_TOKEN })

	const result = await getPrDetailsAndCommitSha(octokit)
	if (!result) {
		nicelog('Could not retrieve PR details. Exiting...')
		return
	}

	const { pr, commitSha } = result

	const triggerType = getTriggerType(pr)
	if (triggerType === 'none') return

	const discord = new Discord({
		webhookUrl: env.DISCORD_DEPLOY_WEBHOOK_URL,
		totalSteps: 3,
		shouldNotify: true,
	})
	await discord.message(`Triggering ${triggerType} hotfix...`)

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

	await discord.step(
		`Cherry-picking PR #${pr.number} onto branch ${latestReleaseBranch}`,
		async () => {
			await exec('git', ['fetch', 'origin', latestReleaseBranch])
			await exec('git', ['fetch', 'origin', 'main'])
			await exec('git', ['checkout', latestReleaseBranch])
			await exec('git', ['reset', `origin/${latestReleaseBranch}`, '--hard'])
			await exec('git', ['log', '-1', '--oneline'])
			await exec('git', ['cherry-pick', commitSha])
		}
	)

	if (triggerType === 'docs') {
		await discord.step(`Ensuring no SDK changes are present`, async () => {
			// run yarn again before building packages to make sure everything is ready
			// in case HEAD included dev dependency changes
			await exec('yarn', ['install'])
			await exec('yarn', ['refresh-assets', '--force'])

			const diff = await getAnyPackageDiff()
			if (diff) {
				let message = kleur.red().bold(`・ERROR・`)
				message += `\nCannot cherry-pick docs changes from PR '${kleur.cyan().bold(pr.title)}' https://github.com/tldraw/tldraw/pulls/${pr}`
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
		})
	} else {
		await discord.step('Running sdk tests', async () => {
			await exec('yarn', ['install'])
			const packages = await getAllWorkspacePackages()

			await exec('yarn', [
				'test',
				...packages
					.filter((p) => !p.packageJson.private)
					.flatMap(({ name }) => ['--project', name]),
			])
		})
	}

	await discord.step('Pushing to release branch', async () => {
		await exec('git', ['push', 'origin', `HEAD:${latestReleaseBranch}`])
	})
	// return
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
