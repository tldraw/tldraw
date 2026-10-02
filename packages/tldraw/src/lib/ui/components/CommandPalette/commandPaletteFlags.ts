import { Atom, atom } from '@tldraw/editor'

/** @internal */
export type CommandPalettePosition = 'top' | 'center' | 'bottom'

/** @internal */
export interface CommandPaletteFlags {
	checkmarksOnRight: Atom<boolean>
	showRecents: Atom<boolean>
	/** Shows why a highlighted disabled row is unavailable, in place of its shortcut. */
	showDisabledReasons: Atom<boolean>
	/** Collapse each submenu into one row you open, instead of listing every "Submenu: item" row. */
	groupSubmenus: Atom<boolean>
	/** tldraw.com: "New file" asks for the name in the palette first. */
	nameNewFiles: Atom<boolean>
	position: Atom<CommandPalettePosition>
}

// Testing only: design variants toggled from the palette's own feature flags submenu.
/** @internal */
export const commandPaletteFlags: CommandPaletteFlags = {
	checkmarksOnRight: atom('command palette flag: checkmarks on right', false),
	showRecents: atom('command palette flag: show recents', true),
	showDisabledReasons: atom('command palette flag: show disabled reasons', true),
	groupSubmenus: atom('command palette flag: group submenus', true),
	nameNewFiles: atom('command palette flag: name new files', false),
	position: atom<CommandPalettePosition>('command palette flag: position', 'bottom'),
}
