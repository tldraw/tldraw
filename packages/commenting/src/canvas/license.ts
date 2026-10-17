import { warnOnce } from '@tldraw/utils'
import { Editor, useLicenseFeatureFlag, useMaybeLicenseManager } from 'tldraw'

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

/**
 * Whether a commenting action may proceed on this editor right now.
 *
 * Unlike {@link useCommentingEnabled} this is permissive while license validation is in flight: a
 * component that asked can re-render when the answer arrives, a one-shot imperative call can't, and
 * refusing it would break the licensed case in order to enforce the unlicensed one. Enforcement
 * lands when validation resolves.
 *
 * @internal
 */
export function canRunCommenting(editor: Editor): boolean {
	return editor.isLicenseValidationPending() || editor.isLicensedFeatureEnabled('commenting')
}

/**
 * Say why a commenting action did nothing. `action` is a noun phrase reading before "did nothing",
 * e.g. `'the comment tool'`. Once per distinct action for the life of the page: a silent no-op is
 * indistinguishable from a forgotten license key, and a gate on a store write or a pin drag would
 * otherwise warn on every frame.
 *
 * @internal
 */
export function warnUnlicensedCommenting(action: string): void {
	warnOnce(
		`${action} did nothing because commenting isn't licensed for this editor. Commenting needs a tldraw license that includes it — pass the key as <Tldraw licenseKey="..." /> or call setLicense({ licenseKey: '...' }). Contact sales@tldraw.com to add commenting to your license.`
	)
}
