import { useLicenseContext, useLicenseFeatureFlag } from '@tldraw/editor'

/**
 * Whether the commenting feature is licensed for this editor. The default comment tool button and
 * its keyboard shortcut are hidden/disabled unless this is true. Enabled in development; in
 * production it requires a license that includes the commenting feature (or the collaboration
 * umbrella that grants it). Reactive: re-reads when license validation resolves.
 *
 * @internal
 */
export function useCommentingEnabled(): boolean {
	return useLicenseFeatureFlag(useLicenseContext(), 'commenting')
}
