import { EditorAtom, type Editor } from 'tldraw'

/**
 * Whether the collections panel is open. Scoped per editor, so two editors on one page don't share
 * it.
 * @public
 */
export const collectionsPanelOpen = new EditorAtom<boolean>('collectionsPanelOpen', () => false)

/** @public */
export function toggleCollectionsPanel(editor: Editor) {
	collectionsPanelOpen.update(editor, (open) => !open)
}
