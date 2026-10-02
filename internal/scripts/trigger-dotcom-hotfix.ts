import { Octokit } from 'octokit'
import { Discord } from './lib/discord'
import { exec } from './lib/exec'
import { makeEnv } from './lib/makeEnv'
import { nicelog } from './lib/nicelog'
import { getPrDetailsAndCommitSha, getPrDetailsByNumber, labelPresent } from './lib/pr-info'
import { stripSkipCiMarkers } from './lib/skip-ci'

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
		totalSteps: 4,
		shouldNotify: true,
		secretValues: Object.values(env),
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

		// release-notes PRs squash-merge with `[skip ci]` in the title. github honours that marker on
		// the cherry-picked commit too, so the hotfix branch's required checks would never start and
		// the PR below would sit in `blocked` until the timeout. strip it before pushing.
		const message = (await exec('git', ['log', '-1', '--format=%B'])).trim()
		const cleanedMessage = stripSkipCiMarkers(message)
		if (cleanedMessage !== message) {
			await exec('git', ['commit', '--amend', '-m', cleanedMessage])
		}
	})

	await discord.step('Pushing hotfix branch to remote', async () => {
		await exec('git', ['push', 'origin', hotfixBranchName])
	})

	await discord.step('Creating hotfix PR and waiting for checks to pass', async () => {
		// the squash-merge onto `hotfixes` is what triggers the production build, and github reads
		// skip-ci markers from the whole commit message. keep them out of the title (used as the
		// commit subject) and the body (used as the commit body when someone merges by hand).
		const originalTitle = stripSkipCiMarkers(pr.title)
		const prTitle = `[HOTFIX] ${originalTitle}`

		// Extract API changes section from original PR if present
		const apiChangesHeader = '### API changes'
		let apiChangesSection = ''
		if (pr.body?.includes(apiChangesHeader)) {
			const bodyAfterHeader = pr.body.split(apiChangesHeader)[1]
			// Extract until next ### header or end of body
			const nextHeaderIndex = bodyAfterHeader.indexOf('\n###')
			apiChangesSection =
				nextHeaderIndex > -1 ? bodyAfterHeader.slice(0, nextHeaderIndex) : bodyAfterHeader
			apiChangesSection = `\n\n${apiChangesHeader}\n${apiChangesSection.trim()}\n`
		}

		const prBody = `This is an automated hotfix PR for dotcom deployment.

**Original PR:** [#${pr.number}](https://github.com/tldraw/tldraw/pull/${pr.number})
**Original Title:** ${originalTitle}
**Original Author:** @${pr.user?.login}

This PR cherry-picks the changes from the original PR to the hotfixes branch for immediate dotcom deployment.${apiChangesSection}

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
		await discord.message(
			`📝 Created hotfix PR: <https://github.com/tldraw/tldraw/pull/${createdPr.data.number}>`
		)
		nicelog(`Waiting for PR #${createdPr.data.number} to be ready for merge...`)

		async function noteManualMerge(mergedByLogin: string | undefined) {
			const by = mergedByLogin ? `@${mergedByLogin}` : 'someone'
			nicelog(`Hotfix PR #${createdPr.data.number} was merged manually by ${by}`)
			await discord.message(`✅ Hotfix PR #${createdPr.data.number} was merged manually by ${by}`)
		}

		// Maximum wait time: 15 minutes total (action timeout is 20 mins, we need buffer for Discord notification)
		const maxWaitTimeMs = 15 * 60 * 1000
		const startTime = Date.now()

		// Wait for 5 minutes initially, then check every 15 seconds (our checks take at least 5 mins)
		await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000))

		let checkedForMissingChecks = false

		while (true) {
			// Check if we've exceeded the timeout
			const elapsedTime = Date.now() - startTime
			if (elapsedTime >= maxWaitTimeMs) {
				nicelog(`Timeout: PR #${createdPr.data.number} checks did not complete in time`)
				throw new Error(
					`Hotfix PR #${createdPr.data.number} checks timed out after ${Math.round(elapsedTime / 60000)} minutes. Please check the PR manually: https://github.com/tldraw/tldraw/pull/${createdPr.data.number}`
				)
			}
			const prStatus = await getPrDetailsByNumber(octokit, createdPr.data.number)

			// github stops reporting mergeability once a PR is merged or closed by hand, so without
			// this we'd spin until the timeout and report a false failure for a hotfix that landed.
			if (prStatus.merged) {
				await noteManualMerge(prStatus.merged_by?.login)
				break
			}
			if (prStatus.state === 'closed') {
				throw new Error(`Hotfix PR #${createdPr.data.number} was closed without being merged`)
			}

			nicelog(`PR #${createdPr.data.number} mergeable_state: ${prStatus.mergeable_state}`)

			if (prStatus.mergeable_state === 'clean') {
				nicelog(`PR #${createdPr.data.number} is ready for merge`)
				try {
					await octokit.rest.pulls.merge({
						owner: 'tldraw',
						repo: 'tldraw',
						pull_number: createdPr.data.number,
						merge_method: 'squash',
						commit_title: prTitle,
						commit_message: `This is an automated hotfix for dotcom deployment.

Original PR: #${pr.number}
Original Author: @${pr.user?.login}`,
					})
				} catch (error) {
					// the merge api rejects an already-merged PR, so re-check before reporting a failure
					const latest = await getPrDetailsByNumber(octokit, createdPr.data.number)
					if (!latest.merged) throw error
					await noteManualMerge(latest.merged_by?.login)
					break
				}

				nicelog(`Successfully merged hotfix PR #${createdPr.data.number}`)
				break
			} else if (prStatus.mergeable_state === 'unstable') {
				nicelog(`PR #${createdPr.data.number} is unstable (some checks failed)`)
				throw new Error(`Hotfix PR #${createdPr.data.number} is unstable`)
			} else if (prStatus.mergeable_state === 'dirty') {
				nicelog(`PR #${createdPr.data.number} has conflicts and cannot be merged`)
				throw new Error(`Hotfix PR #${createdPr.data.number} has conflicts`)
			} else {
				// `blocked` with no check runs at all means nothing is going to change: the push didn't
				// start any workflows (a skip-ci marker that survived, or a required check that isn't
				// wired up). fail now with a pointer instead of spinning until the timeout.
				if (prStatus.mergeable_state === 'blocked' && !checkedForMissingChecks) {
					checkedForMissingChecks = true
					const checks = await octokit.rest.checks.listForRef({
						owner: 'tldraw',
						repo: 'tldraw',
						ref: prStatus.head.sha,
						per_page: 1,
					})
					if (checks.data.total_count === 0) {
						throw new Error(
							`Hotfix PR #${createdPr.data.number} is blocked and no check runs have started on ${hotfixBranchName}. The required checks will never report, so it can't be merged automatically. Look at the commit message on that branch for a skip-ci marker: https://github.com/tldraw/tldraw/pull/${createdPr.data.number}`
						)
					}
				}
				nicelog(
					`PR #${createdPr.data.number} merge status: ${prStatus.mergeable_state}, waiting...`
				)
				await new Promise((resolve) => setTimeout(resolve, 15 * 1000))
				continue
			}
		}
	})

	await discord.step('Checks have passed, deploy will start soon', async () => {
		// This step just provides user feedback after successful merge
	})
}

main().catch(async (e: Error) => {
	console.error(e)

	const env = getEnv()
	const discord = new Discord({
		webhookUrl: env.DISCORD_DEPLOY_WEBHOOK_URL,
		totalSteps: 3,
		shouldNotify: true,
		secretValues: Object.values(env),
	})

	await discord
		.message(
			`❌ **Error triggering dotcom hotfix**\n\n\`\`\`ansi\n${e.message.slice(0, 2000)}\n\`\`\``
		)
		.finally(() => {
			process.exit(1)
		})
})
