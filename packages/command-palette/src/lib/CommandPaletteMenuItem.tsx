import { useTldrawUiComponents, TldrawUiMenuActionItem } from 'tldraw'
import { useCommandPaletteEnabled } from './license'

/**
 * A menu item that opens the command palette, to place in a menu such as the main menu or the
 * keyboard shortcuts dialog. Renders nothing when the `CommandPalette` slot is empty or the
 * `open-command-palette` action from {@link commandPaletteOverrides} is missing, and while the
 * command palette isn't licensed.
 *
 * @public @react
 */
export function CommandPaletteMenuItem() {
	const { CommandPalette } = useTldrawUiComponents()
	const isLicensed = useCommandPaletteEnabled()
	if (!CommandPalette || !isLicensed) return null
	return <TldrawUiMenuActionItem actionId="open-command-palette" />
}
