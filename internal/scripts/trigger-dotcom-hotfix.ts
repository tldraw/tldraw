import { Octokit } from 'octokit'
import { Discord } from './lib/discord'
import { exec } from './lib/exec'
import { makeEnv } from './lib/makeEnv'
import { nicelog } from './lib/nicelog'
import { getPrDetailsAndCommitSha, getPrDetailsByNumber, labelPresent } from './lib/pr-info'

function getEnv() {
	return makeEnv(['DISCORD_DEPLOY_WEBHOOK_URL', 'GITHUB_TOKEN'])
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
		await exec('git', ['fetch', 'origin', 'hotfixes'])
		await exec('git', ['fetch', 'origin', 'main'])
		await exec('git', ['checkout', 'hotfixes'])
		await exec('git', ['reset', '--hard', 'origin/hotfixes'])
		await exec('git', ['checkout', '-b', hotfixBranchName])
		await exec('git', ['cherry-pick', commitSha])
	})

	await discord.step('Pushing hotfix branch to remote', async () => {
		await exec('git', ['push', 'origin', hotfixBranchName])
	})

	await discord.step('Creating hotfix PR and waiting for checks to pass', async () => {
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

		nicelog(`Created hotfix PR: ${hotfixBranchName} -> hotfixes`)
		nicelog(`Waiting for PR #${createdPr.data.number} to be ready for merge...`)

		// Wait for 5 minutes initially, then check every 15 seconds (our checks take at least 5 mins)
		await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000))

		while (true) {
			const prStatus = await getPrDetailsByNumber(octokit, createdPr.data.number)

			if (prStatus.mergeable === null) {
				nicelog(`PR #${createdPr.data.number} merge status still being calculated, waiting...`)
				await new Promise((resolve) => setTimeout(resolve, 15 * 1000))
				continue
			}

			if (!prStatus.mergeable) {
				nicelog(`PR #${createdPr.data.number} has conflicts and cannot be merged`)
				throw new Error(`Hotfix PR #${createdPr.data.number} cannot be merged`)
			}

			// Get the combined status of all checks
			const status = await octokit.rest.repos.getCombinedStatusForRef({
				owner: 'tldraw',
				repo: 'tldraw',
				ref: prStatus.head.sha,
			})

			nicelog(`PR #${createdPr.data.number} status: ${status.data.state}`)
			nicelog(`Total checks: ${status.data.total_count}`)
			nicelog(
				`Successful checks: ${status.data.statuses.filter((s) => s.state === 'success').length}`
			)
			nicelog(`Failed checks: ${status.data.statuses.filter((s) => s.state === 'failure').length}`)
			nicelog(`Pending checks: ${status.data.statuses.filter((s) => s.state === 'pending').length}`)

			// Check if all status checks have passed
			if (status.data.state === 'success') {
				nicelog(`PR #${createdPr.data.number} is ready for merge`)
				await octokit.rest.pulls.merge({
					owner: 'tldraw',
					repo: 'tldraw',
					pull_number: createdPr.data.number,
					merge_method: 'squash',
					commit_title: `[HOTFIX] ${pr.title}`,
					commit_message: `This is an automated hotfix for dotcom deployment.

Original PR: #${pr.number}
Original Author: @${pr.user?.login}`,
				})

				nicelog(`Successfully merged hotfix PR #${createdPr.data.number}`)
				break
			} else if (status.data.state === 'failure') {
				nicelog(`PR #${createdPr.data.number} has failed checks:`)
				status.data.statuses
					.filter((s) => s.state === 'failure')
					.forEach((check) => {
						nicelog(`  - ${check.context}: ${check.description || 'Failed'}`)
					})
				throw new Error(`Hotfix PR #${createdPr.data.number} has failed checks`)
			} else if (status.data.state === 'pending') {
				nicelog(`PR #${createdPr.data.number} checks still pending, waiting...`)
				await new Promise((resolve) => setTimeout(resolve, 15 * 1000))
				continue
			} else {
				nicelog(`PR #${createdPr.data.number} has unknown status: ${status.data.state}`)
				await new Promise((resolve) => setTimeout(resolve, 15 * 1000))
				continue
			}
		}
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
