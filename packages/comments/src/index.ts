import { registerTldrawLibraryVersion } from '@tldraw/utils'
// eslint-disable-next-line tldraw/no-export-star
export * from './records'
export {
	CommentTool,
	CommentToolbarItem,
	commentToolOverrides,
	commentTools,
	pendingComment,
	type PendingComment,
} from './canvas/comment-tool'
export { CommentBody, type CommentBodyProps } from './canvas/comment-body'
export { CanvasComments, type CanvasCommentsProps } from './canvas/comments-overlay'
export { CanvasCommentsSidebar, type CanvasCommentsSidebarProps } from './canvas/comments-sidebar'
export { anchorPagePoint, focusThread, openThreadId } from './canvas/thread-state'
export {
	commentsPlugin,
	type CommentsPluginOptions,
	type CommentsPluginUser,
} from './commentsPlugin'
export {
	addComment,
	resolveThread,
	startCommentThread,
	useCommentThreads,
	useThreadComments,
} from './hooks'
export { richTextToPlaintext } from './canvas/rich-text'
export { Avatar, type AvatarProps } from './ui/avatar'
export { Byline, type BylineProps } from './ui/byline'
export { CommentCard, type CommentCardProps } from './ui/comment-card'
export { CommentComposer, type CommentComposerProps } from './ui/comment-composer'
export { CommentPin, type CommentPinProps } from './ui/comment-pin'
export { CommentText, type CommentTextProps } from './ui/comment-text'
export { CommentThread, type CommentThreadProps } from './ui/comment-thread'
export { CommentsList, type CommentListItemProps, type CommentsListProps } from './ui/comments-list'
export { EmptyState, type EmptyStateProps } from './ui/empty-state'
export { formatRelativeTime } from './ui/format-time'
export { Mention, type MentionProps } from './ui/mention'
export { Reaction, type ReactionProps } from './ui/reaction'
export { Reactions } from './ui/reactions'
export { renderMarkdown } from './ui/render-markdown'
export { SendButton, type SendButtonProps } from './ui/send-button'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
