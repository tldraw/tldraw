import {
	BoardIcon,
	BoardLibrarySource,
	CompositeLibrarySource,
	type BoardLibrarySourceOptions,
	type LibrarySource,
} from '@tldraw/libraries'
import { createElement } from 'react'
import { defineMessages, type Editor } from 'tldraw'
import type { TldrawApp } from '../../app/TldrawApp'
import { TrackedLibrarySource } from './trackedLibrarySource'

const messages = defineMessages({
	thisBoard: { defaultMessage: 'This board' },
})

const sources = new WeakMap<Editor, { fileId: string; source: LibrarySource }>()

/**
 * The libraries an open file's editor offers: the board's own, kept as records in the file's
 * document so they are saved, synced and duplicated with it, then the user's own libraries under
 * the workspaces they belong to. New libraries go to the user's home workspace.
 *
 * Made once per editor, so the panel and the context menu share it. Changes made through it are
 * tracked. `reporting` is where the board's source reports a thumbnail that fails to upload.
 */
export function getEditorLibraries(
	app: Pick<TldrawApp, 'getHomeWorkspaceId' | 'msg' | 'trackEvent'>,
	userLibraries: LibrarySource,
	editor: Editor,
	fileId: string,
	reporting: Pick<BoardLibrarySourceOptions, 'toasts' | 'msg'> = {}
): LibrarySource {
	const existing = sources.get(editor)
	if (existing && existing.fileId === fileId) return existing.source
	const composite = new CompositeLibrarySource({
		// The user source's id, so choices the UI keeps per source carry over.
		id: userLibraries.id,
		defaultOwnerId: app.getHomeWorkspaceId(),
		parts: [
			{
				owner: { id: fileId, name: app.msg(messages.thisBoard), icon: createElement(BoardIcon) },
				source: new BoardLibrarySource(editor, { id: `board:${fileId}`, ...reporting }),
			},
			{ source: userLibraries },
		],
	})
	const source = new TrackedLibrarySource(composite, app, fileId)
	sources.set(editor, { fileId, source })
	return source
}
