import { Atom, Editor, atom, getFromLocalStorage, setInLocalStorage } from '@tldraw/editor'

// Shared by the navigation panel's button and the `toggle-minimap` action. Per editor, so two
// editors on a page don't fold each other's minimap; the stored value only seeds new ones.
const collapsedByEditor = new WeakMap<Editor, Atom<boolean>>()

function getCollapsedAtom(editor: Editor) {
	let collapsed = collapsedByEditor.get(editor)
	if (!collapsed) {
		let initial = true
		try {
			const stored = getFromLocalStorage('minimap')
			if (stored) initial = JSON.parse(stored) === true
		} catch {
			// A corrupt value leaves the minimap collapsed.
		}
		collapsed = atom('minimap collapsed', initial)
		collapsedByEditor.set(editor, collapsed)
	}
	return collapsed
}

/** @internal */
export function isMinimapCollapsed(editor: Editor) {
	return getCollapsedAtom(editor).get()
}

/** @internal */
export function toggleMinimap(editor: Editor) {
	const collapsed = getCollapsedAtom(editor)
	collapsed.set(!collapsed.get())
	setInLocalStorage('minimap', JSON.stringify(collapsed.get()))
}
