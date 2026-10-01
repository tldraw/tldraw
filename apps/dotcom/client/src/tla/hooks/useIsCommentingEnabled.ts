import { useMaybeApp } from './useAppState'

/**
 * Whether to show any commenting UI (tool, pins, threads, sidebar, notifications) on tldraw.com:
 * every signed-in user has it. Signed-out viewers have no app, and so no commenting: the one thing
 * they do get is the comment button, which prompts them to sign in rather than entering the tool —
 * see `useAnonCommentToolOverrides` and its two call sites, `TlaEditor` and the anonymous scratch
 * board in `pages/local`.
 *
 * This is dotcom's own gate, separate from `useCommentingEnabled` in `@tldraw/commenting`, which
 * says whether commenting is licensed for the editor at all. Both have to pass.
 */
export function useIsCommentingEnabled(): boolean {
	return useMaybeApp() !== null
}
