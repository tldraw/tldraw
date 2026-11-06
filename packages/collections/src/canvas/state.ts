import { EditorAtom, type Editor } from 'tldraw'
import type { TLCollectionId } from '../lib/schema'

/**
 * Whether the collections panel is open. Scoped per editor, so two editors on one page don't share
 * it.
 * @public
 */
export const collectionsPanelOpen = new EditorAtom<boolean>('collectionsPanelOpen', () => false)

/**
 * A collection for the panel to bring into view: its section unfolds and scrolls into view, then
 * this clears. Kept on the editor, so setting it while the panel is closed shows the collection
 * when the panel next opens.
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

/** The collection whose name the panel header is editing, e.g. straight after creating it. */
export const renamingCollectionId = new EditorAtom<TLCollectionId | null>(
	'renamingCollectionId',
	() => null
)

/** The collections folded shut in the panel, kept while the panel is closed. */
export const collapsedCollectionIds = new EditorAtom<TLCollectionId[]>(
	'collapsedCollectionIds',
	() => []
)

/** The panel's sections showing every item rather than their first few rows. */
export const expandedCollectionIds = new EditorAtom<TLCollectionId[]>(
	'expandedCollectionIds',
	() => []
)
