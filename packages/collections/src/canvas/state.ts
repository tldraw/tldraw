import { EditorAtom, type Editor } from 'tldraw'
import type { TLCollectionId } from '../lib/schema'

/**
 * Whether the collections panel is open. Scoped per editor, so two editors on one page don't share
 * it.
 * @public
 */
export const collectionsPanelOpen = new EditorAtom<boolean>('collectionsPanelOpen', () => false)

/**
 * A collection to bring into view: the panel unfolds it and scrolls to it, then clears this. Set it
 * with {@link collectionsPanelOpen} to show a collection, e.g. one just saved to.
 * @public
 */
export const activeCollectionId = new EditorAtom<TLCollectionId | null>(
	'activeCollectionId',
	() => null
)

/** @public */
export function toggleCollectionsPanel(editor: Editor) {
	collectionsPanelOpen.update(editor, (open) => !open)
}

/** The collection whose name its section header is editing, e.g. straight after creating it. */
export const renamingCollectionId = new EditorAtom<TLCollectionId | null>(
	'renamingCollectionId',
	() => null
)

/** The collections folded shut in the panel, kept while the panel is closed. */
export const collapsedCollectionIds = new EditorAtom<TLCollectionId[]>(
	'collapsedCollectionIds',
	() => []
)
