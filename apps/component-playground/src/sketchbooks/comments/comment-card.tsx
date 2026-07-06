import './comments.css'

export interface CommentCardProps {
	author: string
	body: string
	time: string
	you: boolean
}

function initials(name: string) {
	return name
		.split(' ')
		.map((word) => word[0] ?? '')
		.join('')
		.slice(0, 2)
		.toUpperCase()
}

/** A single comment: avatar, author, timestamp, body. */
export function CommentCard({ author, body, time, you }: CommentCardProps) {
	return (
		<div className={you ? 'cmt-card cmt-card--you' : 'cmt-card'}>
			<div className="cmt-avatar" aria-hidden="true">
				{initials(author)}
			</div>
			<div className="cmt-body">
				<div className="cmt-head">
					<span className="cmt-author">{author}</span>
					<span className="cmt-time">{time}</span>
				</div>
				<p className="cmt-text">{body}</p>
			</div>
		</div>
	)
}
