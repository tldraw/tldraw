import { TLDRAW_ORG, TLDRAW_PUBLIC_REPO, TLDRAW_PUBLIC_REPO_MAIN_BRANCH } from '../config'
import { Flow } from '../flow'

export const enforcePrLabels: Flow = {
	name: 'enforcePrLabels',
	async onPullRequest(ctx, event) {
		if (event.repository.full_name !== `${TLDRAW_ORG}/${TLDRAW_PUBLIC_REPO}`) return
		if (event.pull_request.base.ref !== TLDRAW_PUBLIC_REPO_MAIN_BRANCH) return

		const fail = async (message: string) => {
			await ctx.octokit.rest.repos.createCommitStatus({
				owner: event.repository.owner.login,
				repo: event.repository.name,
				sha: event.pull_request.head.sha,
				state: 'failure',
				description: message,
				context: 'Release Label',
			})
		}

		const succeed = async (message: string) => {
			await ctx.octokit.rest.repos.createCommitStatus({
				owner: event.repository.owner.login,
				repo: event.repository.name,
				sha: event.pull_request.head.sha,
				state: 'success',
				description: message,
				context: 'Release Label',
			})
		}

		const pull = event.pull_request

		if (pull.draft) {
			return await succeed('Draft PR, skipping label check')
		}

		if (pull.closed_at || pull.merged_at) {
			return await succeed('Closed PR, skipping label check')
		}

		const availableLabels = (
			await ctx.octokit.rest.issues.listLabelsForRepo({
				owner: event.repository.owner.login,
				repo: event.repository.name,
			})
		).data.map((x) => x.name)

		const prBody = pull.body

		const selectedReleaseLabels = availableLabels.filter((label) =>
			prBody?.match(new RegExp(`^\\s*?-\\s*\\[\\s*x\\s*\\]\\s+\`${label}\``, 'm'))
		) as string[]

		if (selectedReleaseLabels.length === 0 && pull.labels.length === 0) {
			return fail('Please add a label to the PR.')
		}

		// add any labels that are checked
		console.log('adding labels')
		if (selectedReleaseLabels.length > 0) {
			await ctx.octokit.rest.issues.addLabels({
				issue_number: pull.number,
				owner: event.repository.organization ?? event.repository.owner.login,
				repo: event.repository.name,
				labels: selectedReleaseLabels,
			} as any)
		}

		return await succeed(`PR is labelled!`)
	},
}
