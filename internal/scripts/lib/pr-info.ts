import { Octokit } from 'octokit'
import { exec } from './exec'
import { nicelog } from './nicelog'

export async function getPrDetails(octokit: Octokit) {
	const lastCommitMessage = (await exec('git', ['log', '-1', '--oneline'])).trim()
	const lastPRNumber = lastCommitMessage.match(/\(#(\d+)\)$/)?.[1]
	if (!lastPRNumber) {
		nicelog('No PR number found in last commit message. Exiting...')
		return null
	}

	return await octokit.rest.pulls
		.get({
			owner: 'tldraw',
			repo: 'tldraw',
			pull_number: parseInt(lastPRNumber),
		})
		.then((res) => res.data)
}

export type PullRequest = NonNullable<Awaited<ReturnType<typeof getPrDetails>>>

export function labelPresent(pr: PullRequest, labelName: string): boolean {
	const label = pr.labels.find((label) => label.name === labelName)

	if (!label) {
		nicelog(`No "${labelName}" label found. Exiting...`)
		return false
	}

	nicelog(`Found "${labelName}" label. Proceeding...`)
	return true
}
