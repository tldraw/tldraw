import { Octokit } from 'octokit'
import { Discord } from './lib/discord'
import { exec } from './lib/exec'
import { makeEnv } from './lib/makeEnv'
import { nicelog } from './lib/nicelog'
import { getPrDetails, labelPresent } from './lib/pr-info'

function getEnv() {
	return makeEnv(['DISCORD_DEPLOY_WEBHOOK_URL', 'GITHUB_TOKEN'])
}

async function main() {
	const env = getEnv()
	const octokit = new Octokit({ auth: env.GITHUB_TOKEN })

	const pr = await getPrDetails(octokit)
	if (!pr) {
		nicelog('Could not retrieve PR details from the last commit. Exiting...')
		return
	}

	if (!labelPresent(pr, 'dotcom-hotfix-please')) {
		nicelog('No dotcom-hotfix-please label found. Exiting...')
		return
	}

	const discord = new Discord({
		webhookUrl: env.DISCORD_DEPLOY_WEBHOOK_URL,
		totalSteps: 3,
		shouldNotify: true,
	})
	await discord.message(`🚀 Triggering dotcom hotfix for PR #${pr.number}...`)

	const hotfixBranchName = `hotfix/dotcom-${pr.number}`

	await discord.step(`Creating hotfix branch and cherry-picking changes`, async () => {
		const HEAD = (await exec('git', ['rev-parse', 'HEAD'])).trim()
		await exec('git', ['fetch', 'origin', 'hotfixes'])
		await exec('git', ['checkout', '-b', hotfixBranchName, 'origin/hotfixes'])
		await exec('git', ['cherry-pick', HEAD])
	})

	await discord.step('Pushing hotfix branch to remote', async () => {
		await exec('git', ['push', 'origin', hotfixBranchName])
	})

	await discord.step('Creating hotfix PR and adding to merge queue', async () => {
		const prTitle = `[HOTFIX] ${pr.title}`
		const prBody = `This is an automated hotfix PR for dotcom deployment.

**Original PR:** [#${pr.number}](https://github.com/tldraw/tldraw/pull/${pr.number})
**Original Title:** ${pr.title}
**Original Author:** @${pr.user?.login}

This PR cherry-picks the changes from the original PR to the hotfixes branch for immediate dotcom deployment.

/cc @${pr.user?.login}`

		const createdPr = await octokit.rest.pulls.create({
			owner: 'tldraw',
			repo: 'tldraw',
			title: prTitle,
			body: prBody,
			head: hotfixBranchName,
			base: 'hotfixes',
		})

		await octokit.rest.pulls.merge({
			owner: 'tldraw',
			repo: 'tldraw',
			pull_number: createdPr.data.number,
			merge_method: 'squash',
			auto_merge: true,
			commit_title: `[HOTFIX] ${pr.title}`,
			commit_message: `This is an automated hotfix for dotcom deployment.

Original PR: #${pr.number}
Original Author: @${pr.user?.login}`,
		})

		nicelog(`Created hotfix PR: ${hotfixBranchName} -> hotfixes`)
		nicelog(`Added hotfix PR #${createdPr.data.number} to merge queue`)
	})
}

main().catch(async (e: Error) => {
	console.error(e)

	const discord = new Discord({
		webhookUrl: process.env.DISCORD_DEPLOY_WEBHOOK_URL!,
		totalSteps: 3,
		shouldNotify: true,
	})

	await discord
		.message(
			`❌ **Error triggering dotcom hotfix**\n\n\`\`\`ansi\n${e.message.slice(0, 2000)}\n\`\`\``
		)
		.finally(() => {
			process.exit(1)
		})
})
