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

		if (pull.labels.length === 0) {
			return await fail(`PR has no label. Please select at least one label! Any will do!`)
		}

		return await succeed('Got at lease one label!')
	},
}
