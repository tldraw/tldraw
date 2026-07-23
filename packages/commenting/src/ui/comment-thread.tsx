import { ReactNode } from 'react'
import { CommentCard, CommentCardProps } from './comment-card'
import { CommentComposer, CommentComposerProps } from './comment-composer'

/** @public */
export interface CommentThreadProps {
	/** The thread's comments, already adapted to card props (oldest first). */
	comments: CommentCardProps[]
	/** Optional header, e.g. "Thread". Omit for no header. */
	header?: ReactNode
	/** Action controls shown at the right of the header (resolve, delete, dismiss…). */
	headerActions?: ReactNode
	/** When set, shows a banner above the comments (e.g. "Resolved by Jess"). */
	resolvedBanner?: ReactNode
	/** Reply composer props. Omit for a read-only thread (no composer). */
	composer?: CommentComposerProps
	/** Shown at the bottom of the thread (e.g. a sign-in prompt when there's no composer). When
	 *  both are set, the footer renders after the composer. */
	footer?: ReactNode
	/** Override how each comment renders. Defaults to `<CommentCard>`. */
	renderComment?(comment: CommentCardProps, index: number): ReactNode
}

/**
 * A comment thread: an optional header, an optional resolved banner, the comments, and an
 * optional reply composer. Presentational — you supply the comments (as card props) and the
 * composer's handlers; how each comment renders is overridable via `renderComment`.
 * @public @react
 */
export function CommentThread({
	comments,
	header,
	headerActions,
	resolvedBanner,
	composer,
	footer,
	renderComment,
}: CommentThreadProps) {
	return (
		<div className="tlui-cmt-thread">
			{(header !== undefined || headerActions !== undefined) && (
				<div className="tlui-cmt-thread__header">
					<span className="tlui-cmt-thread__title">{header}</span>
					{headerActions !== undefined && (
						<div className="tlui-cmt-thread__actions">{headerActions}</div>
					)}
				</div>
			)}
			{resolvedBanner !== undefined && (
				<div className="tlui-cmt-thread__resolved">{resolvedBanner}</div>
			)}
			<div className="tlui-cmt-thread__list">
				{comments.map((comment, i) => (
					<div key={i}>
						{renderComment ? renderComment(comment, i) : <CommentCard {...comment} />}
					</div>
				))}
			</div>
			{composer !== undefined && <CommentComposer {...composer} />}
			{footer !== undefined && <div className="tlui-cmt-thread__footer">{footer}</div>}
		</div>
	)
}
