// GitHub skips both push- and pull_request-triggered workflows when one of these markers appears
// in a commit message, in the positions documented at
// https://docs.github.com/en/actions/managing-workflow-runs/skipping-workflow-runs
// `[^\S\r\n]` rather than `\s`: eating the newlines around a marker on its own body line would
// close the blank line separating subject from body, and `git commit --amend -m` would then fold
// the whole first paragraph into the subject.
const SKIP_CI_MARKER = /[^\S\r\n]*\[(?:skip ci|ci skip|no ci|skip actions|actions skip)\]/gi

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
