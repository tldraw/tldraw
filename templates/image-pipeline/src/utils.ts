import { atom, Atom, Editor, WeakCache } from 'tldraw'

/** An atom scoped to a specific editor, for state shared between several components. */
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
