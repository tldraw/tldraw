import { QueryResultType } from '@rocicorp/zero'
import {
	CanvasComments,
	CanvasCommentsSidebar,
	CommentAuthor,
	CommentingContext,
	filterMentionMembers,
	MentionMember,
} from '@tldraw/commenting'
import { queries } from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TLUiOverrides, useDialogs, useEditor, useValue } from 'tldraw'
import { routes } from '../../../routeDefs'
import { useMaybeApp } from '../../hooks/useAppState'
import { useCommentTracking } from '../../hooks/useCommentTracking'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { defineMessages, F, useMsg } from '../../utils/i18n'
import { TlaSignInDialog } from '../dialogs/TlaSignInDialog'
import { TlaCtaButton } from '../TlaCtaButton/TlaCtaButton'
import { latestForeignReactionAt } from '../TlaSidebar/components/commentNotifications'

type FileComments = QueryResultType<typeof queries.fileComments>
type FileVisitors = QueryResultType<typeof queries.fileVisitors>

const commentMessages = defineMessages({
	// Matches the notifications panel and the toolkit's own byline default for an unnamed author.
	unknownAuthor: { defaultMessage: 'Someone' },
})

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
	useCommentTracking()
	// Guests who signed in by email have no name yet, so their roster rows would be blank. Name them
	// the same way the rest of the commenting UI names an author it can't resolve.
	const unknownAuthor = useMsg(commentMessages.unknownAuthor)

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

	// Everyone who has opened this file (identity denormalized onto their file_visitor row — see
	// migration 044), so past viewers — not just workspace members — can be @-mentioned. Same
	// live-view lifecycle as above.
	const [fileVisitors, setFileVisitors] = useState<FileVisitors>([])
	useEffect(() => {
		if (!app) return
		const view = app.materializeQuery<FileVisitors>(queries.fileVisitors({ fileId }))
		setFileVisitors(view.data)
		const unlisten = view.addListener((data) => setFileVisitors(data))
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

	// Ids of unread comments: others' comments with no read receipt, plus own comments whose
	// newest foreign reaction postdates the receipt — so opening the thread writes/advances the
	// receipt and clears the "reacted to your comment" notification. Zero comment row ids are
	// TLComment record ids verbatim, so these map straight onto store records.
	const unreadCommentIds = useMemo(() => {
		const ids = new Set<string>()
		for (const c of fileComments) {
			if (c.authorId !== currentUserId) {
				if (!c.read) ids.add(c.id)
			} else {
				const latestForeign = latestForeignReactionAt(c.reactions, currentUserId)
				if (latestForeign !== undefined && latestForeign > (c.read?.readAt ?? -Infinity))
					ids.add(c.id)
			}
		}
		return ids
	}, [fileComments, currentUserId])

	// Presence changes on every cursor move, dozens of times a second, but the id → name/color it
	// derives to almost never does. Holding the Map's identity keeps the computed's epoch still, so
	// cursor movement doesn't re-render the pins overlay and sidebar.
	const presenceAuthorsRef = useRef<Map<string, CommentAuthor>>(new Map())
	const presenceAuthors = useValue(
		'presence authors',
		() => {
			const authors = new Map<string, CommentAuthor>()
			for (const p of editor.store.query.records('instance_presence').get()) {
				if (p.userName) {
					authors.set(p.userId.replace(/^user:/, ''), { name: p.userName, color: p.color })
				}
			}
			if (presenceAuthorsEqual(presenceAuthorsRef.current, authors)) {
				return presenceAuthorsRef.current
			}
			presenceAuthorsRef.current = authors
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
				name: m.userName || unknownAuthor,
				color: m.userColor,
				you: m.userId === app.userId,
			}))
		},
		[app, fileId, unknownAuthor]
	)
	// The past-viewer half of the roster: everyone who has opened this file. Their rows are trigger-
	// written from the user row, so a blank userName is a nameless guest rather than a missing
	// join — same fallback as members. The query already excludes the current user, so `you` is
	// never set here.
	const viewerMembers = useMemo(
		() =>
			fileVisitors.map((v) => ({
				id: v.userId,
				name: v.userName || unknownAuthor,
				color: v.userColor || undefined,
			})),
		[fileVisitors, unknownAuthor]
	)
	// The full @-mention roster: workspace members plus any past viewer who isn't already a member.
	// Members win on id collision: both sources are trigger-synced to the user row, but member
	// entries carry the `you` flag, so they're the richer representation of the same identity.
	const roster = useMemo(() => {
		const byId = new Map<string, MentionMember>(mentionMembers.map((m) => [m.id, m]))
		for (const v of viewerMembers) {
			if (!byId.has(v.id)) byId.set(v.id, v)
		}
		return [...byId.values()]
	}, [mentionMembers, viewerMembers])
	// Roster authors keyed by id — a MentionMember is a CommentAuthor. The roster is the id→name
	// source for a mentioned member or viewer who's committed no comment and isn't currently present —
	// without it, they resolve to nothing and render as the byline default rather than their name.
	const memberAuthors = useMemo(
		() => new Map<string, CommentAuthor>(roster.map((m) => [m.id, m])),
		[roster]
	)
	// Resolve an id to current display info from the sources the client has: self, comment
	// authors, live presence, and the mention roster (workspace members and past viewers). Returns
	// undefined when none can resolve the id (e.g. a deleted account) — the client has no global user
	// directory — so the toolkit falls back to a mention's stored label, or a generic byline default.
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
	const onCommentsRead = useCallback(
		(commentIds: string[]) => app?.markCommentsRead(commentIds),
		[app]
	)
	const getMentionSuggestions = useCallback(
		(query: string) => filterMentionMembers(roster, query),
		[roster]
	)
	// A thread's deep link into this file, so surfaces can offer open-in-new-tab.
	const getThreadHref = useCallback(
		(threadId: string) => `${routes.tlaFile(fileId)}?comment=${encodeURIComponent(threadId)}`,
		[fileId]
	)

	// Both surfaces read the same context — the signed-in user, the author resolver, read status —
	// so it's built once here and spread into each rather than repeated on both.
	const commenting = useMemo(
		(): CommentingContext => ({
			currentUserId,
			resolveAuthor,
			isCommentUnread: app ? isCommentUnread : undefined,
			onCommentsRead: app ? onCommentsRead : undefined,
			getMentionSuggestions,
			getThreadHref,
		}),
		[
			app,
			currentUserId,
			resolveAuthor,
			isCommentUnread,
			onCommentsRead,
			getMentionSuggestions,
			getThreadHref,
		]
	)

	return (
		<>
			<CanvasComments {...commenting} />
			<CanvasCommentsSidebar {...commenting} />
		</>
	)
}

/** Value equality for the presence-author maps: same ids, each with the same name and color. */
function presenceAuthorsEqual(
	a: ReadonlyMap<string, CommentAuthor>,
	b: ReadonlyMap<string, CommentAuthor>
): boolean {
	if (a.size !== b.size) return false
	for (const [id, author] of b) {
		const prev = a.get(id)
		if (!prev || prev.name !== author.name || prev.color !== author.color) return false
	}
	return true
}

const signInMessages = defineMessages({
	signInToComment: { defaultMessage: 'Sign in to comment' },
})

/** For signed-out viewers, the comment tool button and its `c` shortcut open the sign-in dialog
 *  instead of entering the tool. Compose after `commentToolOverrides`, which registers the tool. */
export function useAnonCommentToolOverrides(): TLUiOverrides {
	const app = useMaybeApp()
	const trackEvent = useTldrawAppUiEvents()
	const ctaString = useMsg(signInMessages.signInToComment)
	return useMemo(() => {
		if (app) return {}
		return {
			tools(_editor, tools, { addDialog }) {
				const comment = tools.comment
				if (comment) {
					comment.onSelect = () => {
						trackEvent('sign-up-clicked', { source: 'comments', ctaMessage: ctaString })
						addDialog({ component: TlaSignInDialog })
					}
				}
				return tools
			},
		}
	}, [app, trackEvent, ctaString])
}

/** Anon viewers read comments but don't compose — the toolkit's `ComposerFallback` slot holds
 *  this sign-in prompt (registered via `CommentTool.configure` in `TlaEditor`). */
export function SignInToComment() {
	const editor = useEditor()
	// Fallback slots render for every non-composing session; the CTA is only honest for a
	// signed-out visitor on an editable canvas — signing in unlocks nothing on view-only.
	const isReadonly = useValue('isReadonly', () => editor.getIsReadonly(), [editor])
	const app = useMaybeApp()
	const { addDialog } = useDialogs()
	const trackEvent = useTldrawAppUiEvents()
	const ctaString = useMsg(signInMessages.signInToComment)
	if (isReadonly || app) return null
	return (
		<TlaCtaButton
			canvas
			data-testid="tla-sign-in-to-comment-button"
			onClick={() => {
				trackEvent('sign-up-clicked', { source: 'comments', ctaMessage: ctaString })
				addDialog({ component: TlaSignInDialog })
			}}
		>
			<F {...signInMessages.signInToComment} />
		</TlaCtaButton>
	)
}
