import { CommentCard, CommentPin } from '@tldraw/commenting'
import { TLComment, TLCommentThread } from 'tldraw'
import { commentToCardProps, resolvedByName } from '../../comment-model'
import './anchored-comment.css'

export interface AnchoredCommentProps {
	thread: TLCommentThread
	comments: TLComment[]
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
	const resolved = thread.resolved !== null
	const resolver = resolvedByName(thread)
	return (
		<div className="cmt-anchored">
			<CommentPin number={comments.length} resolved={resolved} open={open} />
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
