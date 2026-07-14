import { ReactNode, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
	TLComment,
	TLCommentId,
	useContainer,
	useEditor,
	usePassThroughMouseOverEvents,
	usePassThroughWheelEvents,
	useTranslation,
	useValue,
} from 'tldraw'
import { CommentListItemProps, CommentsList } from '../ui/comments-list'
import { CommentsFilterMenu } from './comments-filter-menu'
import { CommentsOverflowMenu } from './comments-overflow-menu'
import { useComments, useCommentThreads } from './hooks'
import { useCommentingEnabled } from './license'
import { useCommentingOptions } from './options'
import { richTextToPlaintext } from './rich-text'
import { openThreadId, sidebarFilters } from './state'
import { focusThread } from './thread-state'
import './canvas.css'

export interface CanvasCommentsSidebarProps {
	/** Map an author id to a display name. */
	resolveName(id: string): string
	/** The signed-in user's id. Enables the "only your threads" filter when present. */
	currentUserId?: string
	/**
	 * Whether a comment is unread for the current user (return true for unread). Enables the
	 * "only unread" filter when present.
	 */
	isCommentUnread?(commentId: TLCommentId): boolean
	/**
	 * Render a thread's preview (its first comment). Defaults to the plaintext of the body.
	 * @deprecated Configure the `ThreadPreview` slot via `CommentTool.configure({ components })`
	 * instead.
	 */
	renderPreview?(comment: TLComment): ReactNode
	/** Tool ids that show the sidebar. Defaults to the comment tool. */
	tools?: string[]
	/** Header above the list. */
	header?: ReactNode
	/** Shown when the page has no threads. */
	empty?: ReactNode
	/** Where imprecise shape pins sit, so navigation centres on the same spot. Default top-right. */
	impreciseShapeAnchor?: { x: number; y: number }
}

/**
 * A comments list panel for the current page, shown while the comment tool is active. Clicking a
 * thread brings its pin into view and opens it. Batteries-included over the store (a sibling to
 * `CanvasComments`); `CommentsList` is exported for a differently-placed or always-on list.
 */
export function CanvasCommentsSidebar(props: CanvasCommentsSidebarProps) {
	const {
		resolveName,
		currentUserId,
		isCommentUnread,
		tools,
		header,
		empty,
		impreciseShapeAnchor,
	} = props
	// Back-compat: honor the deprecated `renderPreview` prop, read through a structural view so its
	// deprecation doesn't flag every internal use here.
	const renderPreview = (props as { renderPreview?(comment: TLComment): ReactNode }).renderPreview
	const editor = useEditor()
	const options = useCommentingOptions()
	const sidebarTools = tools ?? options.sidebarTools
	const container = useContainer()
	const commentingEnabled = useCommentingEnabled()
	const msg = useTranslation()
	const threads = useCommentThreads(editor)
	const comments = useComments(editor)
	const currentPageId = useValue('page id', () => editor.getCurrentPageId(), [editor])
	const activeTool = useValue('tool id', () => editor.getCurrentToolId(), [editor])
	const openId = useValue('open thread', () => openThreadId.get(editor), [editor])
	const filters = useValue('sidebar filters', () => sidebarFilters.get(editor), [editor])
	const pageNames = useValue(
		'page names',
		() => new Map(editor.getPages().map((page) => [page.id, page.name])),
		[editor]
	)

	if (!commentingEnabled || !sidebarTools.includes(activeTool)) return null

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

	const items: CommentListItemProps[] = pageThreads
		.filter((thread) => filters.showResolved || thread.resolved == null)
		// "Only mine" is ignored without a known user — otherwise a persisted onlyMine=true would
		// empty the list for a signed-out viewer, with the (hidden) toggle giving no way to clear it.
		.filter(
			(thread) =>
				!filters.onlyMine || currentUserId === undefined || thread.createdBy === currentUserId
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
			let preview: ReactNode = ''
			// Precedence: legacy render prop > component slot > built-in plaintext default.
			const ThreadPreview = options.components.ThreadPreview
			if (first) {
				preview = renderPreview ? (
					renderPreview(first)
				) : ThreadPreview ? (
					<ThreadPreview comment={first} />
				) : (
					richTextToPlaintext(first.body)
				)
			}
			return {
				id: thread.id,
				author: resolveName(thread.createdBy),
				preview,
				date: new Date((first ?? thread).createdAt).toISOString(),
				resolved: thread.resolved != null,
				page: pageNames.get(thread.pageId),
				count: threadComments.length,
				selected: openId === thread.id,
			}
		})
		// unresolved first, then most-recent first
		.sort((a, b) => {
			if (!!a.resolved !== !!b.resolved) return a.resolved ? 1 : -1
			return b.date.localeCompare(a.date)
		})

	const focus = (id: string) => {
		const thread = threads.find((t) => t.id === id)
		if (thread) focusThread(editor, thread, impreciseShapeAnchor)
	}

	return (
		<SidebarPanel container={container}>
			<CommentsList
				items={items}
				header={header ?? msg('comments.title')}
				headerAction={
					<div className="cmt-list__header-actions">
						<CommentsFilterMenu
							canFilterByAuthor={currentUserId !== undefined}
							canFilterByUnread={isCommentUnread !== undefined}
						/>
						<CommentsOverflowMenu />
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

/** The sidebar surface, portaled into the container. Over it, wheel and hover events pass through to
 *  the canvas (except where the list scrolls itself), matching tldraw's own panels. */
function SidebarPanel({ container, children }: { container: HTMLElement; children: ReactNode }) {
	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)
	usePassThroughMouseOverEvents(ref)
	return createPortal(
		<div ref={ref} className="cmt-canvas-sidebar">
			{children}
		</div>,
		container
	)
}
