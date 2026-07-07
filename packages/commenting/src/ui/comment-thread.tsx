import { ReactNode } from 'react'
import { CommentCard, CommentCardProps } from './comment-card'
import { CommentComposer, CommentComposerProps } from './comment-composer'
import './comments.css'

export interface CommentThreadProps {
	/** The thread's comments, already adapted to card props (oldest first). */
	comments: CommentCardProps[]
	/** Optional header, e.g. "Thread". Omit for no header. */
	header?: ReactNode
	/** When set, shows a "Resolved by <name>" banner above the comments. */
	resolvedBy?: string
	/** Reply composer props. Omit for a read-only thread (no composer). */
	composer?: CommentComposerProps
	/** Override how each comment renders. Defaults to `<CommentCard>`. */
	renderComment?(comment: CommentCardProps, index: number): ReactNode
}

/**
 * A comment thread: an optional header, an optional resolved banner, the comments, and an
 * optional reply composer. Presentational — you supply the comments (as card props) and the
 * composer's handlers; how each comment renders is overridable via `renderComment`.
 */
export function CommentThread({
	comments,
	header,
	resolvedBy,
	composer,
	renderComment,
}: CommentThreadProps) {
	return (
		<div className="cmt-thread">
			{header !== undefined && <div className="cmt-thread__header">{header}</div>}
			{resolvedBy !== undefined && (
				<div className="cmt-thread__resolved">Resolved by {resolvedBy}</div>
			)}
			<div className="cmt-thread__list">
				{comments.map((comment, i) => (
					<div key={i}>
						{renderComment ? renderComment(comment, i) : <CommentCard {...comment} />}
					</div>
				))}
			</div>
			{composer !== undefined && <CommentComposer {...composer} />}
		</div>
	)
}
