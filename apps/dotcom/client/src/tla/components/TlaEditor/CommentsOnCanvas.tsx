import { QueryResultType } from '@rocicorp/zero'
import {
	CanvasComments,
	CanvasCommentsSidebar,
	CommentAuthor,
	filterMentionMembers,
} from '@tldraw/commenting'
import { queries } from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useEditor, useValue } from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'

type FileComments = QueryResultType<typeof queries.fileComments>

/**
 * dotcom's comments layer: a thin consumer of `@tldraw/commenting`'s `<CanvasComments>`.
 * All the flow (tool, pins, thread popovers, composer, rich-text bodies) lives in the toolkit;
 * dotcom only supplies the pieces that are its own — the signed-in user's id, an author resolver
 * (current user from preferences, other authors from the Zero comments query's denormalized
 * author fields, with live presence as a fallback for users who haven't committed a comment yet,
 * e.g. a draft composer's byline), and comment read status from Zero's read receipts.
 *
 * Read status and author names come from a Zero query scoped to this one file (not the app-level
 * notifications feed, which is bounded to recent comments), so every unread pin resolves however
 * old the comment is.
 */
export function CommentsOnCanvas({ fileId }: { fileId: string }) {
	const editor = useEditor()
	const app = useMaybeApp()
	const currentUserId = app?.userId ?? null

	const currentUser = useValue(
		'current user',
		(): CommentAuthor => {
			if (!app) return { name: 'You' }
			const prefs = app.tlUser.userPreferences.get()
			return {
				name: prefs.name || 'You',
				color: prefs.color ?? undefined,
			}
		},
		[app]
	)

	// This file's comments (denormalized author fields + the caller's read receipts) from Zero. A
	// live view we own — resubscribed when the file changes and destroyed on unmount.
	const [fileComments, setFileComments] = useState<FileComments>([])
	useEffect(() => {
		if (!app) return
		const view = app.materializeQuery<FileComments>(queries.fileComments({ fileId }))
		setFileComments(view.data)
		const unlisten = view.addListener((data) => setFileComments(data))
		return () => {
			unlisten()
			view.destroy()
		}
	}, [app, fileId])

	const commentAuthors = useMemo(() => {
		const authors = new Map<string, CommentAuthor>()
		for (const c of fileComments) {
			if (c.authorName) {
				authors.set(c.authorId, {
					name: c.authorName,
					color: c.authorColor || undefined,
				})
			}
		}
		return authors
	}, [fileComments])

	// Ids of unread comments: others' comments with no read receipt in Zero. Zero comment row ids
	// are TLComment record ids verbatim (see commentRecordToRow in the sync-worker), so these map
	// straight onto store records. Own comments never get a receipt and never count as unread.
	const unreadCommentIds = useMemo(() => {
		const ids = new Set<string>()
		for (const c of fileComments) {
			if (c.authorId !== currentUserId && !c.read) ids.add(c.id)
		}
		return ids
	}, [fileComments, currentUserId])

	const presenceAuthors = useValue(
		'presence authors',
		() => {
			const authors = new Map<string, CommentAuthor>()
			for (const p of editor.store.query.records('instance_presence').get()) {
				if (p.userName) {
					authors.set(p.userId.replace(/^user:/, ''), { name: p.userName, color: p.color })
				}
			}
			return authors
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
	// Roster authors keyed by id — a MentionMember is a CommentAuthor. The workspace roster is the
	// id→name source for a mentioned member who's committed no comment and isn't currently present —
	// without it, they resolve to nothing and render as the byline default rather than their name.
	const memberAuthors = useMemo(
		() => new Map<string, CommentAuthor>(mentionMembers.map((m) => [m.id, m])),
		[mentionMembers]
	)
	// Resolve an id to current display info from the sources the client has: self, comment
	// authors, live presence, and the workspace roster. Returns undefined when none can resolve the
	// id (e.g. a deleted account) — the client has no global user directory — so the toolkit falls
	// back to a mention's stored label, or a generic byline default.
	const resolveAuthor = useCallback(
		(id: string): CommentAuthor | undefined => {
			if (id === currentUserId) return currentUser
			return commentAuthors.get(id) ?? presenceAuthors.get(id) ?? memberAuthors.get(id)
		},
		[currentUserId, currentUser, commentAuthors, presenceAuthors, memberAuthors]
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
				resolveAuthor={resolveAuthor}
				isCommentUnread={app ? isCommentUnread : undefined}
				onCommentRead={app ? onCommentRead : undefined}
				getMentionSuggestions={getMentionSuggestions}
			/>
			<CanvasCommentsSidebar
				resolveAuthor={resolveAuthor}
				currentUserId={currentUserId ?? undefined}
				isCommentUnread={app ? isCommentUnread : undefined}
			/>
		</>
	)
}
