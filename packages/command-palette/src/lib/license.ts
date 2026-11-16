import { useLicenseFeatureFlag, useMaybeLicenseManager } from 'tldraw'

/**
 * Whether the command palette is licensed for this editor. Enabled in development; in production it
 * requires a tldraw license that includes the command palette feature. Reactive: re-reads when
 * license validation resolves, and returns `false` while validation is pending, so the palette stays
 * hidden until the license is confirmed. With no editor at all this is `false`.
 *
 * {@link CommandPalette} and the `open-command-palette` action from {@link commandPaletteOverrides}
 * gate on this. Use it to gate a custom palette, such as one built on {@link CommandPaletteShell},
 * the same way.
 *
 * @public
 */
export function useCommandPaletteEnabled(): boolean {
	return useLicenseFeatureFlag(useMaybeLicenseManager(), 'commandPalette')
}
