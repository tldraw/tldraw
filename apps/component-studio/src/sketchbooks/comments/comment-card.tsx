import { Avatar } from './avatar'
import { Byline } from './byline'
import { CommentText } from './comment-text'
import './comments.css'

export interface CommentCardProps {
	author: string
	body: string
	/** ISO datetime; formatted to relative time by the component. */
	date: string
	you: boolean
	/** Whether the comment has been edited (shows an "edited" marker). */
	edited?: boolean
}

/** A single comment, composed from Avatar, Byline, and CommentText. */
export function CommentCard({ author, body, date, you, edited }: CommentCardProps) {
	return (
		<div className={you ? 'cmt-card cmt-card--you' : 'cmt-card'}>
			<Avatar name={author} />
			<div className="cmt-body">
				<Byline author={author} date={date} edited={edited} />
				<CommentText text={body} />
			</div>
		</div>
	)
}
