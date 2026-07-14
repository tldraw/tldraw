// The tldraw-coupled commenting layer: the comment tool, reactive hooks over the comment
// records, a rich-text body renderer, and a batteries-included <CanvasComments> overlay. Pairs
// with the presentational components at the package root.

export { CommentBody, type CommentBodyProps } from './canvas/comment-body'
export {
	CommentTool,
	commentToolOverrides,
	commentTools,
	type PendingComment,
} from './canvas/comment-tool'
export { collectClusterLeaves } from './canvas/cluster-input'
export { computeClusterTable } from './clustering/computeClusterTable'
export { createClusterRuntime, type ClusterRuntime } from './clustering/runtime'
export type { ClusterNode, ClusterTable, LeafInput } from './clustering/types'
export { CommentsFilterMenu, type CommentsFilterMenuProps } from './canvas/comments-filter-menu'
export { CommentsMenuItem } from './canvas/comments-menu-item'
export { CanvasComments, type CanvasCommentsProps } from './canvas/comments-overlay'
export {
	type CommentingComponents,
	type CommentingOptions,
	defaultCommentingOptions,
	getCommentingOptions,
	useCommentingOptions,
} from './canvas/options'
export { CommentsOverflowMenu } from './canvas/comments-overflow-menu'
export { CanvasCommentsSidebar, type CanvasCommentsSidebarProps } from './canvas/comments-sidebar'
export { useComments, useCommentThreads, useThreadComments } from './canvas/hooks'
export { useCommentingEnabled } from './canvas/license'
export { richTextToPlaintext } from './canvas/rich-text'
export { DEFAULT_SIDEBAR_FILTERS, type SidebarFilters } from './canvas/sidebar-filters'
export {
	commentsHidden,
	openThreadId,
	pendingComment,
	runComment,
	sidebarFilters,
	toggleCommentsHidden,
	useCommentsHidden,
	useOpenThreadId,
	usePendingComment,
	useSidebarFilters,
} from './canvas/state'
export {
	anchorPagePoint,
	DEFAULT_IMPRECISE_SHAPE_ANCHOR,
	focusThread,
	shapeAnchorAt,
} from './canvas/thread-state'
