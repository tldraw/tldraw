import { Avatar, type CommentAuthor } from '@tldraw/mentions'
import { formatRelativeTime } from './format-time'

/** @public */
export interface BylineProps {
	author: CommentAuthor
	/** ISO datetime; formatted to relative time by the component. */
	date: string
	/** Shows an "edited" marker when the comment has been edited. */
	edited?: boolean
	/**
	 * BCP 47 locale for the relative time, e.g. `'fr'`. Defaults to English. The canvas surfaces
	 * pass the editor's current locale, so a localized app gets localized timestamps without
	 * setting this.
	 */
	locale?: string
}

/** A comment's metadata line: author name, relative time, and an edited marker. @public @react */
export function Byline({ author, date, edited, locale }: BylineProps) {
	return (
		<div className="tlui-cmt-head">
			<Avatar author={author} />
			<span className="tlui-cmt-author">{author.name}</span>
			<span className="tlui-cmt-time">
				{formatRelativeTime(date, locale)}
				{edited && <span className="tlui-cmt-edited"> · edited</span>}
			</span>
		</div>
	)
}
