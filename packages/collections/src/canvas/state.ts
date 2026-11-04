import { EditorAtom, type Editor } from 'tldraw'
import type { TLCollectionId, TLCollectionItemId } from '../lib/schema'

/**
 * Whether the collections panel is open. Scoped per editor, so two editors on one page don't share
 * it.
 * @public
 */
export const collectionsPanelOpen = new EditorAtom<boolean>('collectionsPanelOpen', () => false)

/**
 * The collection the panel shows, or null for the first one. Kept on the editor so it survives the
 * panel closing.
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

/** The collections folded shut in the panel's sections, kept while the panel is closed. */
export const collapsedCollectionIds = new EditorAtom<TLCollectionId[]>(
	'collapsedCollectionIds',
	() => []
)

/** The panel's sections showing every item rather than their first few rows. */
export const expandedCollectionIds = new EditorAtom<TLCollectionId[]>(
	'expandedCollectionIds',
	() => []
)

/** An item just saved whose menu opens with its name ready to edit. */
export const renamingItemId = new EditorAtom<TLCollectionItemId | null>(
	'renamingItemId',
	() => null
)

/** An item just saved, which its grid scrolls to and flashes. */
export const highlightedItemId = new EditorAtom<TLCollectionItemId | null>(
	'highlightedItemId',
	() => null
)
