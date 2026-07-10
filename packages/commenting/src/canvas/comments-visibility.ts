import { atom } from 'tldraw'

/**
 * Whether comment pins are hidden on the canvas. This governs the on-canvas layer (pins + open
 * popover) only — the sidebar is unaffected, so you can still browse threads with pins hidden.
 * Toggled by the overflow menu's "hide comments" control and the Shift+C shortcut. A module signal
 * (like {@link openThreadId}) so both the overlay and the menu can share it.
 */
export const commentsHidden = atom<boolean>('commentsHidden', false)

export function toggleCommentsHidden(): void {
	commentsHidden.update((hidden) => !hidden)
}
