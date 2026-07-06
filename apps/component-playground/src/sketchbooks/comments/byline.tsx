import './comments.css'

export interface BylineProps {
	author: string
	time: string
}

/** A comment's metadata line: author name and relative time. */
export function Byline({ author, time }: BylineProps) {
	return (
		<div className="cmt-head">
			<span className="cmt-author">{author}</span>
			<span className="cmt-time">{time}</span>
		</div>
	)
}
