import { registerTldrawLibraryVersion } from '@tldraw/utils'

// Presentational commenting components. These are tldraw-independent and can be used to build
// custom commenting UI. The mention picker, pill, and avatar are re-exported from @tldraw/mentions
// so the commenting public API is unchanged.
export {
	Avatar,
	type AvatarProps,
	type CommentAuthor,
	createMentionSuggestion,
	filterMentionMembers,
	Mention,
	MentionList,
	type MentionListProps,
	type MentionMember,
	type MentionProps,
	type MentionSuggestionOptions,
} from '@tldraw/mentions'
export { Byline, type BylineProps } from './ui/byline'
export { CommentCard, type CommentCardProps } from './ui/comment-card'
export { CommentComposer, type CommentComposerProps } from './ui/comment-composer'
export { CountBadge, type CountBadgeProps } from './ui/count-badge'
export { CommentPin, type CommentPinProps } from './ui/comment-pin'
export { CommentThread, type CommentThreadProps } from './ui/comment-thread'
export { CommentsList, type CommentListItemProps, type CommentsListProps } from './ui/comments-list'
export { EmptyState, type EmptyStateProps } from './ui/empty-state'
export { formatRelativeTime } from './ui/format-time'
export {
	DEFAULT_REACTION_EMOJI,
	EmojiPicker,
	type EmojiPickerProps,
	isAllowedReactionEmoji,
} from './ui/emoji-picker'
export {
	Reaction,
	type ReactionProps,
	type RenderReaction,
	defaultRenderReaction,
	DefaultReactionTooltip,
	DefaultReactionTooltipContent,
	type ReactionTooltipProps,
} from './ui/reaction'
export { ReactionPicker, type ReactionPickerProps } from './ui/reaction-picker'
export {
	Reactions,
	type ReactionReactor,
	type ReactionsProps,
	type ReactionSummary,
} from './ui/reactions'
export { SendButton, type SendButtonProps } from './ui/send-button'

// The tldraw-coupled commenting layer: the comment tool, reactive hooks over the comment
// records, a rich-text body renderer, and a batteries-included <CanvasComments> overlay. Pairs
// with the presentational components above.
export { registerCommentAnchorLifecycle } from './canvas/anchor-lifecycle'
export { CommentBody, type CommentBodyProps } from './canvas/comment-body'
export {
	CommentReactionPicker,
	type CommentReactionPickerProps,
	CommentReactions,
	type CommentReactionsProps,
	summarizeReactions,
	toggleCommentReaction,
	useCommentReactions,
} from './canvas/comment-reactions'
export {
	CommentTool,
	commentToolOverrides,
	commentTools,
	type PendingComment,
} from './canvas/comment-tool'
export {
	getCommentReactions,
	getCommentRecord,
	getComments,
	getCommentThreads,
	putCommentRecords,
	removeCommentRecords,
	type TLCommentRecord,
} from './canvas/comment-store'
export { CommentsFilterMenu, type CommentsFilterMenuProps } from './canvas/comments-filter-menu'
export { CommentsMenuItem } from './canvas/comments-menu-item'
export { CanvasComments, type CanvasCommentsProps } from './canvas/comments-overlay'
export {
	type CommentingComponents,
	type CommentingOptions,
	defaultCommentingOptions,
	getCanComment,
	getCommentingOptions,
	type ShapeCommentPrecisionContext,
	useCanComment,
	useCommentingOptions,
} from './canvas/options'
export { CommentsOverflowMenu } from './canvas/comments-overflow-menu'
export { CommentsVisibilityToggle } from './canvas/comments-visibility-toggle'
export { CanvasCommentsSidebar, type CanvasCommentsSidebarProps } from './canvas/comments-sidebar'
export { useComments, useCommentThreads, useThreadComments } from './canvas/hooks'
export { useCommentingEnabled } from './canvas/license'
export { richTextToPlaintext } from './canvas/rich-text'
export { DEFAULT_SIDEBAR_FILTERS, type SidebarFilters } from './canvas/sidebar-filters'
export {
	commentsHidden,
	commentsSidebarOpen,
	openThreadId,
	revealThread,
	sidebarFilters,
	toggleCommentsHidden,
	toggleCommentsSidebar,
	useCommentsHidden,
	useCommentsSidebarOpen,
	useOpenThreadId,
	useRevealThreadPending,
	useSidebarFilters,
} from './canvas/state'
export { anchorPagePoint, focusThread, shapeAnchorAt } from './canvas/thread-state'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
