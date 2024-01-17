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

		const currentReleaseLabels = pull.labels
			.map((label) => label.name)
			.filter((label) => VALID_LABELS.includes(label))

		if (currentReleaseLabels.length > 1 && !allHaveSameBumpType(currentReleaseLabels)) {
			return fail(`PR has multiple release labels: ${currentReleaseLabels.join(', ')}`)
		}

		const prBody = pull.body

		const selectedReleaseLabels = VALID_LABELS.filter((label) =>
			prBody?.match(new RegExp(`^\\s*?-\\s*\\[\\s*x\\s*\\]\\s+\`${label}\``, 'm'))
		) as (keyof typeof LABEL_TYPES)[]

		if (selectedReleaseLabels.length > 1 && !allHaveSameBumpType(selectedReleaseLabels)) {
			return await fail(
				`PR has multiple checked labels: ${selectedReleaseLabels.join(
					', '
				)}. Please select only one`
			)
		}

		const [current] = currentReleaseLabels
		const [selected] = selectedReleaseLabels

		if (!current && !selected) {
			return await fail(
				`Please assign one of the following release labels to this PR: ${VALID_LABELS.join(', ')}`
			)
		}

		if (current === selected || (current && !selected)) {
			return succeed(`PR has label: ${current}`)
		}

		// otherwise the label has changed or is being set for the first time
		// from the pr body
		if (current) {
			await ctx.octokit.rest.issues.removeLabel({
				issue_number: event.number,
				name: current,
				owner: 'ds300',
				repo: 'lazyrepo',
			})
		}

		console.log('adding labels')
		await ctx.octokit.rest.issues.addLabels({
			issue_number: pull.number,
			owner: event.repository.organization ?? event.repository.owner.login,
			repo: event.repository.name,
			labels: [selected],
		} as any)

		return await succeed(`PR label set to: ${selected}`)
	},
}

const LABEL_TYPES = {
	tests: 'none',
	internal: 'none',
	documentation: 'none',
	dependencies: 'patch',
	major: 'major',
	minor: 'minor',
	patch: 'patch',
}

const VALID_LABELS = Object.keys(LABEL_TYPES)

function allHaveSameBumpType(labels: string[]) {
	const [first] = labels
	return labels.every(
		(label) =>
			LABEL_TYPES[label as keyof typeof LABEL_TYPES] ===
			LABEL_TYPES[first as keyof typeof LABEL_TYPES]
	)
}
