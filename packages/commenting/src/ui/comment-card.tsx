import { ReactNode } from 'react'
import { Avatar } from './avatar'
import { Byline } from './byline'

/** @public */
export interface CommentCardProps {
	author: string
	/** The rendered comment body. The card doesn't dictate a format — pass a `<CommentText>`
	 *  for markdown, a rich-text render, or any node. */
	body: ReactNode
	/** ISO datetime; formatted to relative time by the component. */
	date: string
	you: boolean
	/** Whether the comment has been edited (shows an "edited" marker). */
	edited?: boolean
	/** Hover-revealed controls at the card's top-right (e.g. an edit affordance). */
	actions?: ReactNode
	/** Content under the body, aligned with it rather than the avatar (e.g. a `<Reactions>` row). */
	footer?: ReactNode
}

/** A single comment: Avatar, Byline, and a body slot the consumer renders. @public @react */
export function CommentCard({
	author,
	body,
	date,
	you,
	edited,
	actions,
	footer,
}: CommentCardProps) {
	return (
		<div className={you ? 'tlui-cmt-card tlui-cmt-card--you' : 'tlui-cmt-card'}>
			<Avatar name={author} />
			<div className="tlui-cmt-body">
				<Byline author={author} date={date} edited={edited} />
				{body}
				{footer}
			</div>
			{actions !== undefined && <div className="tlui-cmt-card__actions">{actions}</div>}
		</div>
	)
}
