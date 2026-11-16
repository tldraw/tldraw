import { Atom, localStorageAtom, useValue } from 'tldraw'
import { useIsUiV3 } from '../hooks/useIsUiV3'

/**
 * Throwaway toggles for trying v3 design ideas side by side, flipped from the beaker menu by the
 * share button. Unlike feature flags they are per browser (localStorage), not per user, and nobody
 * outside `ui_v3` sees them. When an idea is decided, delete its switch and keep the winning code.
 *
 * Labels are plain strings, not translated messages: these come and go too often to send to
 * translators.
 */
export interface DesignSwitch {
	id: string
	label: string
	value: Atom<boolean>
}

function designSwitch(id: string, label: string, initialValue = false): DesignSwitch {
	const [value] = localStorageAtom(`tla-design-switch:${id}`, initialValue)
	return { id, label, value }
}

export const designSwitches = {
	// Proves the menu end to end. Replace it with the first real idea.
	placeholder: designSwitch('placeholder', 'Placeholder switch'),
} satisfies Record<string, DesignSwitch>

export type DesignSwitchId = keyof typeof designSwitches

/**
 * Whether a design switch is on. Always false outside `ui_v3`, so a value left in localStorage
 * after someone leaves the allowlist can't change their UI.
 */
export function useDesignSwitch(id: DesignSwitchId): boolean {
	const isUiV3 = useIsUiV3()
	const value = useValue(designSwitches[id].value)
	return isUiV3 && value
}
