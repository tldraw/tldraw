import { registerTldrawLibraryVersion } from '@tldraw/utils'

// Presentational commenting components. These are tldraw-independent and can be used to build
// custom commenting UI.
export { Avatar, type AvatarProps } from './ui/avatar'
export { Byline, type BylineProps } from './ui/byline'
export { CommentCard, type CommentCardProps } from './ui/comment-card'
export { CommentComposer, type CommentComposerProps } from './ui/comment-composer'
export { CountBadge, type CountBadgeProps } from './ui/count-badge'
export { CommentPin, type CommentPinProps } from './ui/comment-pin'
export { CommentText, type CommentTextProps } from './ui/comment-text'
export { CommentThread, type CommentThreadProps } from './ui/comment-thread'
export { CommentsList, type CommentListItemProps, type CommentsListProps } from './ui/comments-list'
export { EmptyState, type EmptyStateProps } from './ui/empty-state'
export { formatRelativeTime } from './ui/format-time'
export { Mention, type MentionProps } from './ui/mention'
export { MentionList, type MentionListProps, type MentionMember } from './ui/mention-list'
export {
	createMentionSuggestion,
	filterMentionMembers,
	type MentionSuggestionOptions,
} from './ui/mention-suggestion'
export { Reaction, type ReactionProps } from './ui/reaction'
export { Reactions } from './ui/reactions'
export { renderMarkdown } from './ui/render-markdown'
export { SendButton, type SendButtonProps } from './ui/send-button'

// The tldraw-coupled commenting layer: the comment tool, reactive hooks over the comment
// records, a rich-text body renderer, and a batteries-included <CanvasComments> overlay. Pairs
// with the presentational components above.
export { CommentBody, type CommentBodyProps } from './canvas/comment-body'
export {
	CommentTool,
	commentToolOverrides,
	commentTools,
	type PendingComment,
} from './canvas/comment-tool'
export { collectClusterLeaves } from './canvas/cluster-input'
export { computeClusterTable } from './clustering/computeClusterTable'
export {
	getCommentRecord,
	getComments,
	getCommentThreads,
	putCommentRecords,
	removeCommentRecords,
	type TLCommentRecord,
} from './canvas/comment-store'
export { createClusterRuntime, type ClusterRuntime } from './clustering/runtime'
export type {
	ClusterNode,
	ClusterOptions,
	ClusterTable,
	LeafInput,
	MergeEvent,
} from './clustering/types'
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
export { DEFAULT_REGION_COMMENT_OPTIONS, type RegionCommentOptions } from './canvas/region-options'
export { richTextToPlaintext } from './canvas/rich-text'
export { DEFAULT_SIDEBAR_FILTERS, type SidebarFilters } from './canvas/sidebar-filters'
export {
	commentsHidden,
	commentsSidebarOpen,
	commitCommentMutation,
	openThreadId,
	pendingComment,
	sidebarFilters,
	toggleCommentsHidden,
	toggleCommentsSidebar,
	useCommentsHidden,
	useCommentsSidebarOpen,
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

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
