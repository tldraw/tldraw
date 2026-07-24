import { Avatar, type CommentAuthor } from '@tldraw/mentions'
import { ReactNode } from 'react'
import { Byline } from './byline'

/** @public */
export interface CommentCardProps {
	author: CommentAuthor
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

/** A single comment: Avatar, Byline, and a body slot the consumer renders. @public @react */
export function CommentCard({ author, body, date, you, edited, actions }: CommentCardProps) {
	return (
		<div className={you ? 'tlui-cmt-card tlui-cmt-card--you' : 'tlui-cmt-card'}>
			<Avatar author={author} />
			<div className="tlui-cmt-body">
				<Byline author={author} date={date} edited={edited} />
				{body}
			</div>
			{actions !== undefined && <div className="tlui-cmt-card__actions">{actions}</div>}
		</div>
	)
}
