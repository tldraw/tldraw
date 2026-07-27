import { type CommentAuthor } from '@tldraw/mentions'
import { formatRelativeTime } from './format-time'

/** @public */
export interface BylineProps {
	author: CommentAuthor
	/** ISO datetime; formatted to relative time by the component. */
	date: string
	/** Shows an "edited" marker when the comment has been edited. */
	edited?: boolean
}

/** A comment's metadata line: author name, relative time, and an edited marker. @public @react */
export function Byline({ author, date, edited }: BylineProps) {
	return (
		<div className="tlui-cmt-head">
			<span className="tlui-cmt-author">{author.name}</span>
			<span className="tlui-cmt-time">
				{formatRelativeTime(date)}
				{edited && <span className="tlui-cmt-edited"> · edited</span>}
			</span>
		</div>
	)
}
