import { ReactNode } from 'react'
import { Avatar } from './avatar'
import { Byline } from './byline'
import './comments.css'

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
}

/**
 * A single comment: Avatar, Byline, and a body slot the consumer renders.
 * @public
 * @react
 */
export function CommentCard({ author, body, date, you, edited, actions }: CommentCardProps) {
	return (
		<div className={you ? 'cmt-card cmt-card--you' : 'cmt-card'}>
			<Avatar name={author} />
			<div className="cmt-body">
				<Byline author={author} date={date} edited={edited} />
				{body}
			</div>
			{actions !== undefined && <div className="cmt-card__actions">{actions}</div>}
		</div>
	)
}
