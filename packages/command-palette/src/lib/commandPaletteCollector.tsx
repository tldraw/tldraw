import { TLUiMenuCollector } from 'tldraw'
import { CommandPalettePathProvider } from './CommandPaletteContext'
import { CommandPaletteItemRegistration } from './CommandPaletteItemRegistration'

/**
 * Turns the `TldrawUiMenu*` components inside the palette into registered rows. Module-level, so
 * the menu context value stays stable and {@link CommandPalettePromptItem} can tell the palette's
 * collector from another one.
 *
 * @internal
 */
export const commandPaletteCollector: TLUiMenuCollector = {
	renderItem(item) {
		return <CommandPaletteItemRegistration {...item} />
	},
	// Labelled groups add a heading and a search path; unlabelled ones are the sections menus draw
	// separators between.
	renderGroup({ id, label, children }) {
		return (
			<CommandPalettePathProvider label={label} sectionId={label ? undefined : id} heading={label}>
				{children}
			</CommandPalettePathProvider>
		)
	},
	renderSubmenu({ id, label, disabled, children }) {
		// An empty label hides the submenu, like an item with one.
		if (disabled || !label) return null
		return (
			<CommandPalettePathProvider label={label} submenuId={id}>
				{children}
			</CommandPalettePathProvider>
		)
	},
}
