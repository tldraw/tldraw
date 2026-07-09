// The tldraw-coupled commenting layer: the comment tool, reactive hooks over the comment
// records, a rich-text body renderer, and a batteries-included <CanvasComments> overlay. Pairs
// with the presentational components at the package root.

export { CommentBody, type CommentBodyProps } from './canvas/comment-body'
export {
	CommentTool,
	commentToolOverrides,
	commentTools,
	pendingComment,
	type PendingComment,
} from './canvas/comment-tool'
export { collectClusterLeaves } from './canvas/cluster-input'
export { computeClusterTable } from './clustering/computeClusterTable'
export { createClusterRuntime, type ClusterRuntime } from './clustering/runtime'
export type { ClusterNode, ClusterTable, LeafInput } from './clustering/types'
export { CommentsFilterMenu, type CommentsFilterMenuProps } from './canvas/comments-filter-menu'
export { CommentsMenuItem } from './canvas/comments-menu-item'
export { CanvasComments, type CanvasCommentsProps } from './canvas/comments-overlay'
export { CommentsOverflowMenu } from './canvas/comments-overflow-menu'
export { CanvasCommentsSidebar, type CanvasCommentsSidebarProps } from './canvas/comments-sidebar'
export { commentsHidden, toggleCommentsHidden } from './canvas/comments-visibility'
export {
	useComments,
	useCommentThreads,
	usePendingComment,
	useThreadComments,
} from './canvas/hooks'
export { richTextToPlaintext } from './canvas/rich-text'
export {
	DEFAULT_SIDEBAR_FILTERS,
	type SidebarFilters,
	sidebarFilters,
} from './canvas/sidebar-filters'
export {
	anchorPagePoint,
	DEFAULT_IMPRECISE_SHAPE_ANCHOR,
	focusThread,
	openThreadId,
	shapeAnchorAt,
} from './canvas/thread-state'
