import { Octokit } from 'octokit'
import { exec } from './exec'
import { nicelog } from './nicelog'

export async function getPrDetailsByNumber(octokit: Octokit, prNumber: number) {
	return await octokit.rest.pulls
		.get({
			owner: 'tldraw',
			repo: 'tldraw',
			pull_number: prNumber,
		})
		.then((res) => res.data)
}

export async function getPrDetails(octokit: Octokit) {
	const lastCommitMessage = (await exec('git', ['log', '-1', '--oneline'])).trim()
	const lastPRNumber = lastCommitMessage.match(/\(#(\d+)\)$/)?.[1]
	if (!lastPRNumber) {
		nicelog('No PR number found in last commit message. Exiting...')
		return null
	}

	return await getPrDetailsByNumber(octokit, parseInt(lastPRNumber))
}

export async function getPrDetailsAndCommitSha(octokit: Octokit) {
	const prNumber = process.env.PR_NUMBER
	nicelog(`PR_NUMBER environment variable: ${prNumber}`)
	let pr: PullRequest | null
	let commitSha: string | null = null

	if (prNumber) {
		// Post-merge mode: get PR details by number
		nicelog(`Post-merge mode: getting PR details for #${prNumber}`)
		pr = await getPrDetailsByNumber(octokit, parseInt(prNumber))
		if (!pr) {
			nicelog('Could not retrieve PR details. Exiting...')
			return null
		}
		commitSha = pr.merge_commit_sha
	} else {
		// Merge-time mode: get PR details from commit message
		nicelog('Merge-time mode: getting PR details from commit message')
		pr = await getPrDetails(octokit)
		if (!pr) {
			nicelog('Could not retrieve PR details. Exiting...')
			return null
		}
		commitSha = (await exec('git', ['rev-parse', 'HEAD'])).trim()
	}

	if (!commitSha) {
		nicelog('PR is not merged or merge commit SHA not available. Exiting...')
		return null
	}

	return { pr, commitSha }
}

export type PullRequest = NonNullable<Awaited<ReturnType<typeof getPrDetailsByNumber>>>

export function labelPresent(pr: PullRequest, labelName: string): boolean {
	return pr.labels.some((label) => label.name === labelName)
}
