import { EditorAtom, type Editor } from 'tldraw'
import type { TLCollectionId } from '../lib/schema'

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
