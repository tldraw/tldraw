import { filterMentionMembers } from '@tldraw/commenting'
import { CanvasComments, CanvasCommentsSidebar } from '@tldraw/commenting/canvas'
import { useCallback, useMemo } from 'react'
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
export function CommentsOnCanvas({ fileId }: { fileId: string }) {
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
	// Ids of unread comments: others' comments with no read receipt in Zero. Zero comment row ids
	// are TLComment record ids verbatim (see commentRecordToRow in the sync-worker), so these map
	// straight onto store records. Own comments never get a receipt and never count as unread.
	const unreadCommentIds = useValue(
		'unread comment ids',
		() => {
			const ids = new Set<string>()
			if (!app) return ids
			for (const c of app.getComments()) {
				if (c.authorId !== app.userId && !c.read) ids.add(c.id)
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
	// The @-mention roster: the members of the workspace that owns this file.
	const mentionMembers = useValue(
		'mention members',
		() => {
			if (!app) return []
			const workspaceId = app.getFile(fileId)?.owningGroupId
			if (!workspaceId) return []
			const membership = app.getWorkspaceMembership(workspaceId)
			if (!membership) return []
			return membership.groupMembers.map((m) => ({
				id: m.userId,
				name: m.userName,
				color: m.userColor,
				you: m.userId === app.userId,
			}))
		},
		[app, fileId]
	)
	// Roster names keyed by id. The workspace roster is the id→name source for a mentioned member
	// who's committed no comment and isn't currently present — without it, they resolve to nothing
	// and render as the byline default rather than their name.
	const memberNames = useMemo(
		() => new Map(mentionMembers.map((m) => [m.id, m.name])),
		[mentionMembers]
	)
	// Resolve an id to a current display name from the sources the client has: self, comment
	// authors, live presence, and the workspace roster. Returns undefined when none can name the id
	// (e.g. a deleted account) — the client has no global user directory — so the toolkit falls back
	// to a mention's stored label, or a generic byline default.
	const resolveName = useCallback(
		(id: string): string | undefined => {
			if (id === currentUserId) return currentUserName
			return authorNames.get(id) ?? presenceNames.get(id) ?? memberNames.get(id)
		},
		[currentUserId, currentUserName, authorNames, presenceNames, memberNames]
	)
	const isCommentUnread = useCallback(
		(commentId: string) => unreadCommentIds.has(commentId),
		[unreadCommentIds]
	)
	const onCommentRead = useCallback((commentId: string) => app?.markCommentRead(commentId), [app])
	const getMentionSuggestions = useCallback(
		(query: string) => filterMentionMembers(mentionMembers, query),
		[mentionMembers]
	)

	return (
		<>
			<CanvasComments
				currentUserId={currentUserId}
				resolveName={resolveName}
				isCommentUnread={app ? isCommentUnread : undefined}
				onCommentRead={app ? onCommentRead : undefined}
				getMentionSuggestions={getMentionSuggestions}
			/>
			<CanvasCommentsSidebar
				resolveName={resolveName}
				currentUserId={currentUserId ?? undefined}
				isCommentUnread={app ? isCommentUnread : undefined}
			/>
		</>
	)
}
