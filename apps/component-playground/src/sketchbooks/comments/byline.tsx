import './comments.css'
import { formatRelativeTime } from './format-time'

export interface BylineProps {
	author: string
	/** ISO datetime; formatted to relative time by the component. */
	date: string
}

/** A comment's metadata line: author name and relative time. */
export function Byline({ author, date }: BylineProps) {
	return (
		<div className="cmt-head">
			<span className="cmt-author">{author}</span>
			<span className="cmt-time">{formatRelativeTime(date)}</span>
		</div>
	)
}
