import { useLicenseContext, useLicenseFeatureFlag } from 'tldraw'

/**
 * Whether commenting is licensed for this editor. Enabled in development; in production it requires
 * a tldraw license that includes the commenting feature (or the collaboration umbrella that grants
 * it). Reactive: re-reads when license validation resolves, and returns `false` while validation is
 * pending, so gated UI stays hidden until the license is confirmed.
 *
 * The built-in commenting components (`CanvasComments`, `CanvasCommentsSidebar`, and the comment
 * tool's toolbar button) gate on this. Use it to gate any custom commenting UI the same way.
 */
export function useCommentingEnabled(): boolean {
	return useLicenseFeatureFlag(useLicenseContext(), 'commenting')
}
