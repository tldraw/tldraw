import { useTldrawUiComponents } from '../../context/components'
import { TldrawUiMenuActionItem } from '../primitives/menus/TldrawUiMenuActionItem'

/**
 * A menu item that opens the command palette. Renders nothing when the `CommandPalette` slot is
 * `null`.
 *
 * @public @react
 */
export function CommandPaletteMenuItem() {
	const { CommandPalette } = useTldrawUiComponents()
	if (!CommandPalette) return null
	return <TldrawUiMenuActionItem actionId="open-command-palette" />
}
