import { Atom, atom } from '@tldraw/editor'

/** @internal */
export type CommandPalettePosition = 'top' | 'center' | 'bottom'

/** @internal */
export type CommandPaletteTopSection = 'recent' | 'suggested' | 'none'

/** @internal */
export interface CommandPaletteFlags {
	checkmarksOnRight: Atom<boolean>
	/** What leads the list while browsing: recently run commands, or ones suggested by context. */
	topSection: Atom<CommandPaletteTopSection>
	/** Heads each group (Selection, Edit, …) while browsing, like Recent. */
	showGroupHeadings: Atom<boolean>
	/** An icon slot before each label, filled with the item's menu icon. */
	showIcons: Atom<boolean>
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
	topSection: atom<CommandPaletteTopSection>('command palette flag: top section', 'recent'),
	showGroupHeadings: atom('command palette flag: show group headings', true),
	showIcons: atom('command palette flag: show icons', false),
	showDisabledReasons: atom('command palette flag: show disabled reasons', true),
	groupSubmenus: atom('command palette flag: group submenus', true),
	nameNewFiles: atom('command palette flag: name new files', false),
	position: atom<CommandPalettePosition>('command palette flag: position', 'bottom'),
}
