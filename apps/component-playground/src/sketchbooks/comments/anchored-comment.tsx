import { Comment, CommentThread, commentToCardProps, resolvedByName } from '../../comment-model'
import { CommentCard } from './comment-card'
import { CommentPin } from './comment-pin'
import './comments.css'

export interface AnchoredCommentProps {
	thread: CommentThread
	comments: Comment[]
	/** Whether the thread popover is open (vs just the pin). */
	open: boolean
}

/**
 * A comment pin that consumes the thread model: it derives its resolved state and count
 * from the thread and its comments, and shows the thread's messages when open. It's
 * "anchor-aware" because the thread owns the anchor — the pin renders from the record,
 * not hand-fed booleans.
 */
export function AnchoredComment({ thread, comments, open }: AnchoredCommentProps) {
	const resolved = thread.resolvedAt !== null
	const resolver = resolvedByName(thread)
	return (
		<div className="cmt-anchored">
			<CommentPin number={comments.length} resolved={resolved} />
			{open && (
				<div className="cmt-thread-popover">
					{resolved && (
						<div className="cmt-resolved-banner">Resolved{resolver ? ` by ${resolver}` : ''}</div>
					)}
					{comments.map((comment) => (
						<CommentCard key={comment.id} {...commentToCardProps(comment)} />
					))}
				</div>
			)}
		</div>
	)
}
