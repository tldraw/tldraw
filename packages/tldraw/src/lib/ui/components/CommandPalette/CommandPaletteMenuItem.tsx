import { useTldrawUiComponents } from '../../context/components'
import { TldrawUiMenuActionItem } from '../primitives/menus/TldrawUiMenuActionItem'

/** @public @react */
export function CommandPaletteMenuItem() {
	const { CommandPalette } = useTldrawUiComponents()
	if (!CommandPalette) return null
	return <TldrawUiMenuActionItem actionId="open-command-palette" />
}
