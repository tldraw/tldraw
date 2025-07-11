import { atom, Atom, Editor, getIndexAbove, getIndices, IndexKey, WeakCache } from 'tldraw'

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

export function indexList<T>(array: T[]): Record<IndexKey, T> {
	const indices = getIndices(array.length)
	return Object.fromEntries(array.map((value, i) => [indices[i], value]))
}
export function indexListEntries<T>(list: Record<IndexKey, T>) {
	return Object.entries(list).sort((a, b) => {
		if (a[0] === b[0]) return 0
		if (a[0] < b[0]) return -1
		return 1
	}) as [IndexKey, T][]
}

export function indexListLength<T>(list: Record<IndexKey, T>) {
	return Object.keys(list).length
}

export function appendToIndexList<T>(list: Record<IndexKey, T>, value: T) {
	const entries = indexListEntries(list)
	const lastIndex = entries[entries.length - 1][0]
	entries.push([getIndexAbove(lastIndex), value])
	return Object.fromEntries(entries)
}
