import { useLicenseFeatureFlag, useMaybeLicenseManager } from 'tldraw'

/**
 * Whether libraries are licensed for this editor. Enabled in development; in production it
 * requires a tldraw license that includes the libraries feature. Reactive: re-reads when license
 * validation resolves, and returns `false` while validation is pending, so gated UI stays hidden
 * until the license is confirmed. Works outside `<Tldraw />` too: UI mounted via `EditorProvider`
 * resolves the license through the editor, and with no editor at all this is `false`.
 *
 * The built-in libraries components (`LibrariesPanel`, `LibrariesPanelButton`, the button
 * `LibrariesQuickActions` adds, and `AddToLibraryMenuItem`) gate on this. Use it to gate any
 * custom libraries UI the same way. Library records and sources are not gated: a document that
 * contains libraries loads, migrates and saves without the license.
 * @public
 */
export function useLibrariesEnabled(): boolean {
	return useLicenseFeatureFlag(useMaybeLicenseManager(), 'libraries')
}
