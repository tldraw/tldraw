import { Atom, Editor, atom, useEditor } from '@tldraw/editor'
import { useLayoutEffect } from 'react'

/** @internal */
export const COMMAND_PALETTE_MENU_ID = 'command palette'

const mountCounts = new WeakMap<Editor, Atom<number>>()

function getMountCount(editor: Editor) {
	let count = mountCounts.get(editor)
	if (!count) {
		count = atom('command palette mount count', 0)
		mountCounts.set(editor, count)
	}
	return count
}

/** @internal */
export function useCommandPaletteMountRegistration() {
	const editor = useEditor()
	useLayoutEffect(() => {
		const count = getMountCount(editor)
		count.update((n) => n + 1)
		return () => {
			count.update((n) => n - 1)
		}
	}, [editor])
}

// Opening the palette with nothing to render it leaves a menu marked open, which disables every
// keyboard shortcut.
/** @internal */
export function isCommandPaletteMounted(editor: Editor) {
	return (mountCounts.get(editor)?.get() ?? 0) > 0
}
