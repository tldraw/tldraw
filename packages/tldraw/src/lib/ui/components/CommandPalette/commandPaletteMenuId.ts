/**
 * The id the `open-command-palette` action marks open in `editor.menus`. A custom `CommandPalette`
 * component must read it with `useMenuIsOpen` and close through it, or the mark stays set and keeps
 * every keyboard shortcut disabled.
 *
 * @public
 */
export const COMMAND_PALETTE_MENU_ID = 'command palette'
