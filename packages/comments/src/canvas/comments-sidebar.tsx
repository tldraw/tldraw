/* eslint-disable tldraw/jsx-no-literals */
import { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useContainer, useEditor, useValue } from 'tldraw'
import { useCommentThreads } from '../hooks'
import { TLComment } from '../records'
import { CommentListItemProps, CommentsList } from '../ui/comments-list'
import { useAllComments } from './hooks'
import { richTextToPlaintext } from './rich-text'
import { focusThread, openThreadId } from './thread-state'
import './canvas.css'

/** @public */
export interface CanvasCommentsSidebarProps {
	/** Map an author id to a display name. */
	resolveName(id: string): string
	/** Render a thread's preview (its first comment). Defaults to the plaintext of the body. */
	renderPreview?(comment: TLComment): ReactNode
	/** Tool ids that show the sidebar. Defaults to the comment tool. */
	tools?: string[]
	/** Header above the list. */
	header?: ReactNode
	/** Shown when the page has no threads. */
	empty?: ReactNode
}

/**
 * A comments list panel for the current page, shown while the comment tool is active. Clicking a
 * thread brings its pin into view and opens it. Batteries-included over the store (a sibling to
 * `CanvasComments`); `CommentsList` is exported for a differently-placed or always-on list.
 * @public
 * @react
 */
export function CanvasCommentsSidebar({
	resolveName,
	renderPreview,
	tools = ['comment'],
	header = 'Comments',
	empty = 'No comments on this page yet.',
}: CanvasCommentsSidebarProps) {
	const editor = useEditor()
	const container = useContainer()
	const threads = useCommentThreads()
	const comments = useAllComments(editor)
	const currentPageId = useValue('page id', () => editor.getCurrentPageId(), [editor])
	const activeTool = useValue('tool id', () => editor.getCurrentToolId(), [editor])
	const openId = useValue('open thread', () => openThreadId.get(), [])
	// `resolveName` may read reactive state (e.g. live presence); wrap it in `useValue` so a signal
	// read inside it is tracked and a stale name doesn't linger until an unrelated re-render.
	const authorNames = useValue(
		'thread author names',
		() => new Map(threads.map((thread) => [thread.id, resolveName(thread.createdBy)])),
		[resolveName, threads]
	)

	if (!tools.includes(activeTool)) return null

	// Group comments by thread (they arrive oldest-first, so [0] is each thread's first comment).
	const byThread = new Map<string, TLComment[]>()
	for (const comment of comments) {
		const list = byThread.get(comment.threadId) ?? []
		list.push(comment)
		byThread.set(comment.threadId, list)
	}

	const items: CommentListItemProps[] = threads
		.filter((thread) => thread.pageId === currentPageId)
		.map((thread) => {
			const threadComments = byThread.get(thread.id) ?? []
			const first = threadComments[0]
			let preview: ReactNode = ''
			if (first) preview = renderPreview ? renderPreview(first) : richTextToPlaintext(first.body)
			return {
				id: thread.id,
				author: authorNames.get(thread.id) ?? '',
				preview,
				date: new Date((first ?? thread).createdAt).toISOString(),
				resolved: thread.resolved != null,
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
		if (thread) focusThread(editor, thread)
	}

	return createPortal(
		<div className="cmt-canvas-sidebar">
			<CommentsList items={items} header={header} empty={empty} onSelect={focus} />
		</div>,
		container
	)
}
