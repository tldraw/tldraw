import { atom, Atom, Editor, WeakCache } from 'tldraw'

export function replaceInArray<T>(array: T[], index: number, value: T) {
	const newArray = array.slice()
	newArray[index] = value
	return newArray
}

export class EditorState<T> {
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
