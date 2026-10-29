import { Editor } from '@tldraw/editor'
import { SelectableRow } from './commandPaletteRows'
import { CommandPaletteEntry, CommandPaletteSubmenu } from './CommandPaletteStore'

/** @internal */
export interface CommandPaletteKeyDownOptions {
	editor: Editor
	dir: 'ltr' | 'rtl'
	query: string
	prompt: CommandPaletteEntry | null
	submenu: CommandPaletteSubmenu | null
	activeRow: SelectableRow | undefined
	/** Moves the highlight by `delta` rows, wrapping. */
	move(delta: number): void
	runRow(row: SelectableRow | undefined): void
	back(): void
	dismiss(): void
}

/** @internal */
export function handleCommandPaletteKeyDown(
	e: React.KeyboardEvent<HTMLInputElement>,
	{
		editor,
		dir,
		query,
		prompt,
		submenu,
		activeRow,
		move,
		runRow,
		back,
		dismiss,
	}: CommandPaletteKeyDownOptions
) {
	// oxlint-disable-next-line typescript/no-deprecated -- Safari sends IME-confirming Enter with isComposing false, keyCode 229
	if (e.nativeEvent.isComposing || e.keyCode === 229) return
	// In RTL the query's end is on the left, so the submenu keys mirror, as in Radix menus.
	const key =
		dir === 'rtl' && e.key === 'ArrowLeft'
			? 'ArrowRight'
			: dir === 'rtl' && e.key === 'ArrowRight'
				? 'ArrowLeft'
				: e.key
	switch (key) {
		case 'ArrowDown':
			e.preventDefault()
			move(1)
			return
		case 'ArrowUp':
			e.preventDefault()
			move(-1)
			return
		case 'Tab':
			e.preventDefault()
			move(e.shiftKey ? -1 : 1)
			return
		case 'Enter': {
			e.preventDefault()
			// Focus is back on the editor by keyup, which would start editing the selected shape. The
			// keyup can be lost (a file picker opens, the app loses focus), so a new key press or a
			// window blur stops the swallow before it eats a later, unrelated Enter.
			const win = editor.getContainerWindow()
			const stop = () => {
				win.removeEventListener('keyup', swallowKeyUp, true)
				win.removeEventListener('keydown', stopOnNewPress, true)
				win.removeEventListener('blur', stop)
			}
			const swallowKeyUp = (up: KeyboardEvent) => {
				if (up.key !== 'Enter') return
				editor.markEventAsHandled(up)
				stop()
			}
			const stopOnNewPress = (down: KeyboardEvent) => {
				if (!down.repeat) stop()
			}
			win.addEventListener('keyup', swallowKeyUp, true)
			win.addEventListener('keydown', stopOnNewPress, true)
			win.addEventListener('blur', stop)
			runRow(activeRow)
			return
		}
		case 'Escape':
			e.preventDefault()
			if (prompt || submenu) back()
			else dismiss()
			return
		// Like a menu, but only at the input's edges, so the caret still moves through the query.
		case 'ArrowRight': {
			const input = e.currentTarget
			const atEnd = input.selectionStart === query.length && input.selectionEnd === query.length
			if (!prompt && activeRow?.type === 'submenu' && atEnd) {
				e.preventDefault()
				runRow(activeRow)
			}
			return
		}
		case 'ArrowLeft': {
			const input = e.currentTarget
			const atStart = input.selectionStart === 0 && input.selectionEnd === 0
			if (!prompt && submenu && atStart) {
				e.preventDefault()
				back()
			}
			return
		}
		case 'Backspace':
			if ((prompt || submenu) && !query) {
				e.preventDefault()
				back()
			}
			return
		default:
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault()
				dismiss()
			}
	}
}
