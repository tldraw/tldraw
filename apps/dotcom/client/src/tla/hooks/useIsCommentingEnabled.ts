import { useMaybeApp } from './useAppState'

/**
 * Whether to show any commenting UI (tool, pins, threads, sidebar, notifications) on tldraw.com.
 * Resolved once when the app is created, from the `commenting_enabled` feature flag plus the
 * signed-in user's email — see `shouldEnableCommenting`. Signed-out viewers have no app, and so no
 * commenting.
 *
 * This is dotcom's own gate, separate from `useCommentingEnabled` in `@tldraw/commenting`, which
 * says whether commenting is licensed for the editor at all. Both have to pass.
 */
export function useIsCommentingEnabled(): boolean {
	return useMaybeApp()?.isCommentingEnabled ?? false
}
