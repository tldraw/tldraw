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
	return pr.labels.some((label) => label.name === labelName)
}
