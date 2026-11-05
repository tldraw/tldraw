import {
	BoardCollectionSource,
	CompositeCollectionSource,
	type CollectionSource,
} from '@tldraw/collections'
import { defineMessages, type Editor } from 'tldraw'
import type { TldrawApp } from '../../app/TldrawApp'
import type { TldrawAppCollectionsWithPacks } from './collectionsWithPacks'

const messages = defineMessages({
	thisBoard: { defaultMessage: 'This board' },
})

const sources = new WeakMap<Editor, { fileId: string; source: CollectionSource }>()

/**
 * The collections an open file's editor offers: the board's own, kept as records in the file's
 * document so they are saved, synced and duplicated with it, then the user's workspace collections
 * and added packs. New collections go to the board unless the editor is read-only.
 *
 * Made once per editor, so the panel and the save menu share it.
 */
export function getEditorCollections(
	app: TldrawApp,
	collections: TldrawAppCollectionsWithPacks,
	editor: Editor,
	fileId: string
): CollectionSource {
	const existing = sources.get(editor)
	if (existing?.fileId === fileId) return existing.source
	const source = new CompositeCollectionSource({
		// The app source's id, so choices the UI keeps per source carry over.
		id: collections.id,
		parts: [
			{
				owner: { id: fileId, name: app.msg(messages.thisBoard) },
				source: new BoardCollectionSource(editor, { id: `board:${fileId}` }),
			},
			{ source: collections },
		],
	})
	sources.set(editor, { fileId, source })
	return source
}
