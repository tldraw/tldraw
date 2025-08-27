import {
	atom,
	Atom,
	Editor,
	getIndexAbove,
	getIndices,
	IndexKey,
	WeakCache,
	ZERO_INDEX_KEY,
} from 'tldraw'

/**
 * EditorAtom is an atom (tldraw's reactive signal) that is scoped to a specific editor. It's useful
 * for storing and reacting to state that's shared between several components.
 *
 * We could use a single global `atom` for each `EditorAtom` use, but that doesn't work if we ever
 * have multiple editors. Even if we don't, scoping UI state to the lifecycle of the editor helps
 * prevent bugs that could be caused from using the same state with two different documents.
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

/**
 * A list of items keyed by fractional indices. This is useful for collaborative editing, very
 * efficient inserts/removals, and keeping the indexes of given items stable as others are
 * inserted/removed around them.
 */
export type IndexList<T> = Record<IndexKey, T>

/**
 * Convert an array into an index list.
 */
export function indexList<T>(array: T[]): IndexList<T> {
	const indices = getIndices(array.length)
	return Object.fromEntries(array.map((value, i) => [indices[i], value]))
}

/**
 * Convert an index list into an array of entries.
 */
export function indexListEntries<T>(list: IndexList<T>) {
	return Object.entries(list).sort((a, b) => {
		if (a[0] === b[0]) return 0
		if (a[0] < b[0]) return -1
		return 1
	}) as [IndexKey, T][]
}

/**
 * Get the length of an index list.
 */
export function indexListLength<T>(list: IndexList<T>) {
	return Object.keys(list).length
}

/**
 * Append a value to an index list.
 */
export function appendToIndexList<T>(list: IndexList<T>, value: T) {
	const entries = indexListEntries(list)
	const lastIndex = entries[entries.length - 1]?.[0] ?? ZERO_INDEX_KEY
	entries.push([getIndexAbove(lastIndex), value])
	return Object.fromEntries(entries)
}
