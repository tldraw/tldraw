// GitHub skips push-triggered workflows when any of these markers appear anywhere in a commit
// message (title or body). See
// https://docs.github.com/en/actions/managing-workflow-runs/skipping-workflow-runs
const SKIP_CI_MARKER = /\s*\[(?:skip ci|ci skip|no ci|skip actions|actions skip)\]/gi

/**
 * Remove GitHub's skip-ci markers from a commit message or PR title.
 *
 * Release-notes PRs carry `[skip ci]` in their title on purpose, so their squash-merge onto `main`
 * doesn't run the push workflows. The hotfix scripts cherry-pick that same commit onto a branch
 * whose push *must* trigger a workflow (the release branch's publish, or the hotfixes branch's
 * production build), so the marker has to go before the push.
 */
export function stripSkipCiMarkers(message: string): string {
	return message.replace(SKIP_CI_MARKER, '').trim()
}
