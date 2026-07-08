/* eslint-disable tldraw/jsx-no-literals */
import { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { TLComment, useContainer, useEditor, useValue } from 'tldraw'
import { CommentListItemProps, CommentsList } from '../ui/comments-list'
import { useComments, useCommentThreads } from './hooks'
import { richTextToPlaintext } from './rich-text'
import { focusThread, openThreadId } from './thread-state'
import './canvas.css'

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
	const threads = useCommentThreads(editor)
	const comments = useComments(editor)
	const currentPageId = useValue('page id', () => editor.getCurrentPageId(), [editor])
	const activeTool = useValue('tool id', () => editor.getCurrentToolId(), [editor])
	const openId = useValue('open thread', () => openThreadId.get(), [])

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
				author: resolveName(thread.createdBy),
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
