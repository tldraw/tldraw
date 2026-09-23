import { useLicenseFeatureFlag, useMaybeLicenseManager } from 'tldraw'

/**
 * Whether commenting is licensed for this editor. Enabled in development; in production it requires
 * a tldraw license that includes the commenting feature (or the collaboration umbrella that grants
 * it). Reactive: re-reads when license validation resolves, and returns `false` while validation is
 * pending, so gated UI stays hidden until the license is confirmed. Works outside `<Tldraw />` too:
 * UI mounted via `EditorProvider` resolves the license through the editor, and with no editor at
 * all this is `false`.
 *
 * The built-in commenting components (`CanvasComments`, `CanvasCommentsSidebar`, and the comment
 * tool's Quick Action) gate on this. Use it to gate any custom commenting UI the same way.
 * @public
 */
export function useCommentingEnabled(): boolean {
	return useLicenseFeatureFlag(useMaybeLicenseManager(), 'commenting')
}
