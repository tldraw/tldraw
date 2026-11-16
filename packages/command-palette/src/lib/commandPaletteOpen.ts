import { EditorAtom, TLUiEventHandler } from 'tldraw'

/**
 * Whether the command palette is open. {@link CommandPalette} mounts the palette while it's set.
 *
 * Not an open menu: for an open menu the editor covers the canvas with a click capture and closes
 * menus on the next click, and the palette should leave the canvas usable while it's open.
 *
 * @internal
 */
export const commandPaletteOpen = new EditorAtom('command palette open', () => false)

/**
 * Set while a {@link CommandPalette} is mounted, to its UI event handler, which the
 * `open-command-palette` action can't reach from the overrides. Without one, nothing would render
 * the palette: the UI is hidden or the `CommandPalette` slot is empty, so the action is unavailable.
 *
 * @internal
 */
export const commandPaletteMount = new EditorAtom<{ trackEvent: TLUiEventHandler } | null>(
	'command palette mount',
	() => null
)
