import { BoardLibrarySource, CompositeLibrarySource, type LibrarySource } from '@tldraw/libraries'
import { defineMessages, type Editor } from 'tldraw'
import type { TldrawApp } from '../../app/TldrawApp'

const messages = defineMessages({
	thisBoard: { defaultMessage: 'This board' },
	yourLibraries: { defaultMessage: 'Your libraries' },
})

const sources = new WeakMap<Editor, { fileId: string; source: LibrarySource }>()

/**
 * The libraries an open file's editor offers: the board's own, kept as records in the file's
 * document so they are saved, synced and duplicated with it, then the user's own libraries. New
 * libraries go to the user's own.
 *
 * Made once per editor, so the panel and the context menu share it.
 */
export function getEditorLibraries(
	app: Pick<TldrawApp, 'userId' | 'msg'>,
	userLibraries: LibrarySource,
	editor: Editor,
	fileId: string
): LibrarySource {
	const existing = sources.get(editor)
	if (existing && existing.fileId === fileId) return existing.source
	const source = new CompositeLibrarySource({
		// The user source's id, so choices the UI keeps per source carry over.
		id: userLibraries.id,
		defaultOwnerId: app.userId,
		parts: [
			{
				owner: { id: fileId, name: app.msg(messages.thisBoard) },
				source: new BoardLibrarySource(editor, { id: `board:${fileId}` }),
			},
			{
				owner: { id: app.userId, name: app.msg(messages.yourLibraries) },
				source: userLibraries,
			},
		],
	})
	sources.set(editor, { fileId, source })
	return source
}
