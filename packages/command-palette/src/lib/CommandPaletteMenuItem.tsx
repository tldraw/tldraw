import { useTldrawUiComponents, TldrawUiMenuActionItem } from 'tldraw'

/**
 * A menu item that opens the command palette, to place in a menu such as the main menu or the
 * keyboard shortcuts dialog. Renders nothing when the `CommandPalette` slot is empty or the
 * `open-command-palette` action from {@link commandPaletteOverrides} is missing.
 *
 * @public @react
 */
export function CommandPaletteMenuItem() {
	const { CommandPalette } = useTldrawUiComponents()
	if (!CommandPalette) return null
	return <TldrawUiMenuActionItem actionId="open-command-palette" />
}
