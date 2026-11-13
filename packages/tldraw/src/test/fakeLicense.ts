import { atom, Editor } from '@tldraw/editor'

/** Gives an editor a stand-in license manager: client permissions need the `permissions` feature. */
export function fakeLicense(
	editor: Editor,
	{ state = 'licensed', permissions = true }: { state?: string; permissions?: boolean } = {}
) {
	const flags = atom('flags', { permissions })
	editor.licenseManager = {
		state: atom('state', state),
		isFeatureEnabled: (feature: string) => (flags.get() as any)[feature] ?? false,
	} as any
	return flags
}
