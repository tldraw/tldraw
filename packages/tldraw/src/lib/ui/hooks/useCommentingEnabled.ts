import { useLicenseFeatureFlag, useMaybeLicenseManager } from '@tldraw/editor'

/**
 * Whether the commenting feature is licensed for this editor. The default comment quick action and
 * its keyboard shortcut are hidden/disabled unless this is true. Enabled in development; in
 * production it requires a license that includes the commenting feature (or the collaboration
 * umbrella that grants it). Reactive: re-reads when license validation resolves. Works outside
 * `<Tldraw />` too: UI mounted via `EditorProvider` resolves the license through the editor, and
 * with no editor at all this is `false`.
 *
 * @internal
 */
export function useCommentingEnabled(): boolean {
	return useLicenseFeatureFlag(useMaybeLicenseManager(), 'commenting')
}
