import { BoardLibrarySource, CompositeLibrarySource, type LibrarySource } from '@tldraw/libraries'
import { defineMessages, type Editor } from 'tldraw'
import type { TldrawApp } from '../../app/TldrawApp'

const messages = defineMessages({
	thisBoard: { defaultMessage: 'This board' },
	tldraw: { defaultMessage: 'tldraw' },
})

const sources = new WeakMap<Editor, { fileId: string; source: LibrarySource }>()

/**
 * The libraries an open file's editor offers: the board's own, kept as records in the file's
 * document so they are saved, synced and duplicated with it, then the user's own libraries under
 * the workspaces they belong to, then the starter packs they added, read-only. New libraries go to
 * the user's home workspace.
 *
 * Made once per editor, so the panel and the context menu share it.
 */
export function getEditorLibraries(
	app: Pick<TldrawApp, 'getHomeWorkspaceId' | 'msg'>,
	userLibraries: LibrarySource,
	starterPacks: LibrarySource,
	editor: Editor,
	fileId: string
): LibrarySource {
	const existing = sources.get(editor)
	if (existing && existing.fileId === fileId) return existing.source
	const source = new CompositeLibrarySource({
		// The user source's id, so choices the UI keeps per source carry over.
		id: userLibraries.id,
		defaultOwnerId: app.getHomeWorkspaceId(),
		parts: [
			{
				owner: { id: fileId, name: app.msg(messages.thisBoard) },
				source: new BoardLibrarySource(editor, { id: `board:${fileId}` }),
			},
			{ source: userLibraries },
			{ owner: { id: 'tldraw', name: app.msg(messages.tldraw) }, source: starterPacks },
		],
	})
	sources.set(editor, { fileId, source })
	return source
}
