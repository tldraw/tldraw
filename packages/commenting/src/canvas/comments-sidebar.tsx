import { ReactNode, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
	TLComment,
	TLCommentThreadId,
	useContainer,
	useEditor,
	usePassThroughMouseOverEvents,
	useTranslation,
	useValue,
} from 'tldraw'
import { CommentListItemProps, CommentsList } from '../ui/comments-list'
import { UNKNOWN_COMMENT_AUTHOR } from './comment-render'
import { CommentsFilterMenu } from './comments-filter-menu'
import { CommentsVisibilityToggle } from './comments-visibility-toggle'
import { type CommentingContext } from './context'
import { useComments, useCommentThreads } from './hooks'
import { useCommentingEnabled } from './license'
import { useCommentingOptions } from './options'
import { richTextToPlaintext } from './rich-text'
import { commentsSidebarOpen, openThreadId, sidebarFilters } from './state'
import { focusThread } from './thread-state'

/**
 * The host wiring for {@link CanvasCommentsSidebar}: the {@link CommentingContext} fields it reads,
 * plus the panel's own slots. A non-null `currentUserId` enables the "only your threads" filter, and
 * an `isCommentUnread` the "only unread" one. `CanvasComments` takes the same fields, so a host
 * mounting both can spread one object into each.
 *
 * @public
 */
export interface CanvasCommentsSidebarProps extends Pick<
	CommentingContext,
	'currentUserId' | 'resolveAuthor' | 'isCommentUnread'
> {
	/** Header above the list. */
	header?: ReactNode
	/** Shown when the page has no threads. */
	empty?: ReactNode
	/**
	 * A link target for a thread's row, so ctrl/cmd-click and middle-click open the thread in a new
	 * tab. A plain click still selects the thread in place (the href isn't followed). Omit to
	 * render plain buttons.
	 */
	getThreadHref?(threadId: TLCommentThreadId): string | undefined
}

/**
 * A comments list panel for the current page, shown while {@link commentsSidebarOpen} is set (e.g.
 * toggled by a button). Clicking a thread brings its pin into view and opens it. Batteries-included
 * over the store (a sibling to `CanvasComments`); `CommentsList` is exported for a differently-placed
 * or always-on list.
 * @public @react
 */
export function CanvasCommentsSidebar(props: CanvasCommentsSidebarProps) {
	const { resolveAuthor, currentUserId, isCommentUnread, header, empty, getThreadHref } = props
	// Name-only view of the resolver, for the plaintext previews (which resolve @-mentions).
	const resolveName = useCallback((id: string) => resolveAuthor(id)?.name, [resolveAuthor])
	const editor = useEditor()
	const options = useCommentingOptions()
	const container = useContainer()
	const commentingEnabled = useCommentingEnabled()
	const msg = useTranslation()
	const threads = useCommentThreads(editor)
	const comments = useComments(editor)
	const currentPageId = useValue('page id', () => editor.getCurrentPageId(), [editor])
	const open = useValue('sidebar open', () => commentsSidebarOpen.get(editor), [editor])
	const openId = useValue('open thread', () => openThreadId.get(editor), [editor])
	const filters = useValue('sidebar filters', () => sidebarFilters.get(editor), [editor])
	const pageNames = useValue(
		'page names',
		() => new Map(editor.getPages().map((page) => [page.id, page.name])),
		[editor]
	)

	if (!commentingEnabled || !open) return null

	// Group comments by thread (they arrive oldest-first, so [0] is each thread's first comment).
	const byThread = new Map<string, TLComment[]>()
	for (const comment of comments) {
		const list = byThread.get(comment.threadId) ?? []
		list.push(comment)
		byThread.set(comment.threadId, list)
	}

	// Page scoping is treated as scoping, not a filter: an empty page reads "no comments yet",
	// while a list emptied by the toggles below reads "nothing matches your filters".
	const pageThreads = threads.filter(
		(thread) => !filters.onlyCurrentPage || thread.pageId === currentPageId
	)

	const rows: SidebarRow[] = pageThreads
		.filter((thread) => filters.showResolved || thread.resolved == null)
		// "Only mine" is ignored without a known user — otherwise a persisted onlyMine=true would
		// empty the list for a signed-out viewer, with the (hidden) toggle giving no way to clear it.
		.filter(
			(thread) => !filters.onlyMine || currentUserId === null || thread.createdBy === currentUserId
		)
		// "Only unread" is likewise ignored without a read-status source.
		.filter(
			(thread) =>
				!filters.onlyUnread ||
				isCommentUnread === undefined ||
				(byThread.get(thread.id) ?? []).some((c) => isCommentUnread(c.id))
		)
		.map((thread) => {
			const threadComments = byThread.get(thread.id) ?? []
			const first = threadComments[0]
			// Comments arrive oldest-first, so the last one is the thread's most recent activity.
			const last = threadComments[threadComments.length - 1]
			let preview: ReactNode = ''
			// The `ThreadPreview` component slot overrides the built-in plaintext default.
			const ThreadPreview = options.components.ThreadPreview
			if (first) {
				preview = ThreadPreview ? (
					<ThreadPreview comment={first} />
				) : (
					richTextToPlaintext(first.body, resolveName)
				)
			}
			return {
				item: {
					id: thread.id,
					author: resolveAuthor(thread.createdBy) ?? UNKNOWN_COMMENT_AUTHOR,
					preview,
					date: new Date((first ?? thread).createdAt).toISOString(),
					resolved: thread.resolved != null,
					// The page label only earns its place when it adds information: multiple pages
					// exist, and the thread is somewhere other than where you already are.
					page:
						pageNames.size > 1 && thread.pageId !== currentPageId
							? pageNames.get(thread.pageId)
							: undefined,
					count: threadComments.length,
					selected: openId === thread.id,
					href: getThreadHref?.(thread.id),
				},
				lastActivity: (last ?? thread).createdAt,
			}
		})

	const items = sortSidebarRows(rows).map((row) => row.item)

	const focus = (id: string) => {
		const thread = threads.find((t) => t.id === id)
		if (thread) focusThread(editor, thread)
	}

	return (
		<SidebarPanel container={container}>
			<CommentsList
				items={items}
				header={header ?? msg('comments.title')}
				headerAction={
					<div className="tlui-cmt-list__header-actions">
						<CommentsFilterMenu
							canFilterByAuthor={currentUserId !== null}
							canFilterByUnread={isCommentUnread !== undefined}
						/>
						<CommentsVisibilityToggle />
					</div>
				}
				empty={
					items.length === 0 && pageThreads.length > 0
						? msg('comments.empty-filtered')
						: (empty ?? msg('comments.empty'))
				}
				resolvedLabel={msg('comments.resolved')}
				onSelect={focus}
			/>
		</SidebarPanel>
	)
}

/** A list row paired with the sort key that isn't part of what the row displays. */
interface SidebarRow {
	item: CommentListItemProps
	/** When the thread's most recent comment was posted — what the list orders by. */
	lastActivity: number
}

/**
 * Order the list: unresolved threads first, then by most recent activity, id as a stable tiebreak.
 * Recency is the thread's *latest* comment, not its first, so a thread someone just replied to rises
 * to the top instead of staying wherever it was started. (The row still shows the thread's opening
 * comment and its date — that's what identifies the thread; only the ordering follows the replies.)
 */
export function sortSidebarRows(rows: readonly SidebarRow[]): readonly SidebarRow[] {
	return [...rows].sort(
		(a, b) =>
			Number(!!a.item.resolved) - Number(!!b.item.resolved) ||
			b.lastActivity - a.lastActivity ||
			(a.item.id < b.item.id ? -1 : 1)
	)
}

/** The sidebar surface, portaled into the container. It scrolls its own list, so — unlike tldraw's
 *  wheel-transparent panels — a wheel over it doesn't pan the canvas. Hover still passes through so
 *  shapes beneath it stay interactive. */
function SidebarPanel({ container, children }: { container: HTMLElement; children: ReactNode }) {
	const ref = useRef<HTMLDivElement>(null)
	usePassThroughMouseOverEvents(ref)
	return createPortal(
		<div ref={ref} className="tlui-cmt-canvas-sidebar" onContextMenu={(e) => e.stopPropagation()}>
			{children}
		</div>,
		container
	)
}
