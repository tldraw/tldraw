import { formatRelativeTime } from './format-time'

/** @public */
export interface BylineProps {
	author: string
	/** ISO datetime; formatted to relative time by the component. */
	date: string
	/** Shows an "edited" marker when the comment has been edited. */
	edited?: boolean
}

/**
 * A comment's metadata line: author name, relative time, and an edited marker.
 * @public
 * @react
 */
export function Byline({ author, date, edited }: BylineProps) {
	return (
		<div className="cmt-head">
			<span className="cmt-author">{author}</span>
			<span className="cmt-time">
				{formatRelativeTime(date)}
				{edited && <span className="cmt-edited"> · edited</span>}
			</span>
		</div>
	)
}
