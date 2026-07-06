import { Avatar } from './avatar'
import { Byline } from './byline'
import { CommentText } from './comment-text'
import './comments.css'

export interface CommentCardProps {
	author: string
	body: string
	time: string
	you: boolean
}

/** A single comment, composed from Avatar, Byline, and CommentText. */
export function CommentCard({ author, body, time, you }: CommentCardProps) {
	return (
		<div className={you ? 'cmt-card cmt-card--you' : 'cmt-card'}>
			<Avatar name={author} />
			<div className="cmt-body">
				<Byline author={author} time={time} />
				<CommentText text={body} />
			</div>
		</div>
	)
}
