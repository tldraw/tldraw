import { atom, Atom, Editor, WeakCache } from 'tldraw'

/**
 * EditorAtom is an atom (tldraw's reactive signal) that is scoped to a specific editor. It's useful
 * for storing and reacting to state that's shared between several components.
 */
export class EditorAtom<T> {
	private states = new WeakCache<Editor, Atom<T>>()
	constructor(
		private name: string,
		private getInitialState: (editor: Editor) => T
	) {}

	getAtom(editor: Editor) {
		return this.states.get(editor, () => atom(this.name, this.getInitialState(editor)))
	}

	get(editor: Editor) {
		return this.getAtom(editor).get()
	}

	update(editor: Editor, update: (state: T) => T) {
		return this.getAtom(editor).update(update)
	}

	set(editor: Editor, state: T) {
		return this.getAtom(editor).set(state)
	}
}
