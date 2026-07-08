// The tldraw-coupled commenting layer: the comment tool, reactive hooks over the comment
// records, a rich-text body renderer, and a batteries-included <CanvasComments> overlay. Pairs
// with the presentational components at the package root.

export { CommentBody, type CommentBodyProps } from './canvas/comment-body'
export {
	CommentTool,
	commentToolComponents,
	commentToolOverrides,
	commentTools,
	pendingComment,
	type PendingComment,
} from './canvas/comment-tool'
export { CanvasComments, type CanvasCommentsProps } from './canvas/comments-overlay'
export { CanvasCommentsSidebar, type CanvasCommentsSidebarProps } from './canvas/comments-sidebar'
export {
	useComments,
	useCommentThreads,
	usePendingComment,
	useThreadComments,
} from './canvas/hooks'
export { richTextToPlaintext } from './canvas/rich-text'
export { anchorPagePoint, focusThread, openThreadId } from './canvas/thread-state'
