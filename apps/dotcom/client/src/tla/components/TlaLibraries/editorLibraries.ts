import {
	BoardLibrarySource,
	CompositeLibrarySource,
	type BoardLibrarySourceOptions,
	type LibrarySource,
} from '@tldraw/libraries'
import { defineMessages, type Editor } from 'tldraw'
import type { TldrawApp } from '../../app/TldrawApp'
import { TldrawAppFileLibrariesSource } from './fileLibrariesSource'
import type { TldrawAppLibrariesSource } from './librariesSource'
import { TrackedLibrarySource } from './trackedLibrarySource'

const messages = defineMessages({
	thisBoard: { defaultMessage: 'This board' },
})

const sources = new WeakMap<Editor, { fileId: string; source: LibrarySource }>()

/**
 * The libraries an open file's editor offers: the board's own, kept as records in the file's
 * document so they are saved, synced and duplicated with it, then the workspace libraries added to
 * the file and the user's default, under their workspaces. New libraries go to the user's home
 * workspace, and are added to the file.
 *
 * Made once per editor, so the panel and the context menu share it, with a view of the file's
 * libraries that lasts as long as the editor. Changes made through it are tracked. `reporting` is
 * where the board's source reports a thumbnail that fails to upload.
 */
export function getEditorLibraries(
	app: Pick<
		TldrawApp,
		| 'getHomeWorkspaceId'
		| 'getFile'
		| 'msg'
		| 'trackEvent'
		| 'z'
		| 'canUpdateFile'
		| 'watchFileLibraries'
	>,
	userLibraries: TldrawAppLibrariesSource,
	editor: Editor,
	fileId: string,
	reporting: Pick<BoardLibrarySourceOptions, 'toasts' | 'msg'> = {}
): LibrarySource {
	const existing = sources.get(editor)
	if (existing && existing.fileId === fileId) return existing.source
	const fileLibraries = new TldrawAppFileLibrariesSource(app, userLibraries, fileId)
	editor.disposables.add(() => fileLibraries.dispose())
	const composite = new CompositeLibrarySource({
		// The user source's id, so choices the UI keeps per source carry over.
		id: userLibraries.id,
		defaultOwnerId: app.getHomeWorkspaceId(),
		parts: [
			{ source: fileLibraries },
			{
				owner: { id: fileId, name: app.msg(messages.thisBoard) },
				source: new BoardLibrarySource(editor, { id: `board:${fileId}`, ...reporting }),
			},
		],
	})
	const source = new TrackedLibrarySource(composite, app, { fileId })
	sources.set(editor, { fileId, source })
	return source
}
