import { CanvasComments, CanvasCommentsSidebar } from '@tldraw/commenting/canvas'
import { useCallback } from 'react'
import { useEditor, useValue } from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'

/**
 * dotcom's comments layer: a thin consumer of `@tldraw/commenting/canvas`'s `<CanvasComments>`.
 * All the flow (tool, pins, thread popovers, composer, rich-text bodies) lives in the toolkit;
 * dotcom only supplies the pieces that are its own — the signed-in user's id, a name resolver
 * (current user from preferences, other authors from the Zero comments query's author join, with
 * live presence as a fallback for users who haven't committed a comment yet, e.g. a draft
 * composer's byline), and comment read status from Zero's read receipts.
 */
export function CommentsOnCanvas() {
	const editor = useEditor()
	const app = useMaybeApp()
	const currentUserId = app?.userId ?? null

	const currentUserName = useValue(
		'current user name',
		() => {
			if (!app) return 'You'
			return app.tlUser.userPreferences.get().name || 'You'
		},
		[app]
	)
	const authorNames = useValue(
		'comment author names',
		() => {
			const names = new Map<string, string>()
			if (!app) return names
			for (const c of app.getComments()) {
				if (c.author?.name) names.set(c.authorId, c.author.name)
			}
			return names
		},
		[app]
	)
	// Comment ids with a read receipt in Zero. Zero comment row ids are TLComment record ids
	// verbatim (see commentRecordToRow in the sync-worker), so receipts map straight onto store
	// records. Own comments never get a receipt; the isCommentUnread callback below treats them
	// as read via its authorId argument.
	const readCommentIds = useValue(
		'read comment ids',
		() => {
			const ids = new Set<string>()
			if (!app) return ids
			for (const c of app.getComments()) {
				if (c.read) ids.add(c.id)
			}
			return ids
		},
		[app]
	)
	const presenceNames = useValue(
		'presence names',
		() => {
			const names = new Map<string, string>()
			for (const p of editor.store.query.records('instance_presence').get()) {
				if (p.userName) names.set(p.userId.replace(/^user:/, ''), p.userName)
			}
			return names
		},
		[editor]
	)
	const resolveName = useCallback(
		(id: string) => {
			if (id === currentUserId) return currentUserName
			return authorNames.get(id) ?? presenceNames.get(id) ?? 'Someone'
		},
		[currentUserId, currentUserName, authorNames, presenceNames]
	)
	const isCommentUnread = useCallback(
		(commentId: string, authorId: string) =>
			authorId !== currentUserId && !readCommentIds.has(commentId),
		[currentUserId, readCommentIds]
	)
	const onCommentRead = useCallback((commentId: string) => app?.markCommentRead(commentId), [app])

	return (
		<>
			<CanvasComments
				currentUserId={currentUserId}
				resolveName={resolveName}
				isCommentUnread={app ? isCommentUnread : undefined}
				onCommentRead={app ? onCommentRead : undefined}
			/>
			<CanvasCommentsSidebar
				resolveName={resolveName}
				currentUserId={currentUserId ?? undefined}
				isCommentUnread={app ? isCommentUnread : undefined}
			/>
		</>
	)
}
