import { EditorAtom } from '@tldraw/editor'

/**
 * Whether the command palette is open. `CommandPaletteSlot` mounts the palette while it's set.
 *
 * Not an open menu: for an open menu the editor covers the canvas with a click capture and closes
 * menus on the next click, and the palette should leave the canvas usable while it's open.
 *
 * @internal
 */
export const commandPaletteOpen = new EditorAtom('command palette open', () => false)
