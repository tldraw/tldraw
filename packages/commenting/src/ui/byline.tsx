import { Avatar, type CommentAuthor } from '@tldraw/mentions'
import { type ReactNode } from 'react'
import { TldrawUiTooltip, useCurrentTranslation } from 'tldraw'
import { formatFullDateTime, formatRelativeTime } from './format-time'

/** @public */
export interface BylineProps {
	author: CommentAuthor
	/** ISO datetime; formatted to relative time by the component. */
	date: string
	/** Shows an "edited" marker when the comment has been edited. */
	edited?: boolean
	/** Draws the author's avatar. Defaults to `<Avatar>`. */
	renderAvatar?(author: CommentAuthor): ReactNode
}

/**
 * A comment's metadata line: author name, relative time, and an edited marker. Hovering the time
 * shows the full date and time in a tooltip.
 * @public @react
 */
export function Byline({ author, date, edited, renderAvatar }: BylineProps) {
	// The relative time is the one piece of a byline that isn't the host's data, so it follows the
	// same translation context as every other string in the UI rather than a prop of its own.
	const { locale } = useCurrentTranslation()
	return (
		<div className="tlui-cmt-head">
			{renderAvatar ? renderAvatar(author) : <Avatar author={author} />}
			<span className="tlui-cmt-author">{author.name}</span>
			<TldrawUiTooltip content={formatFullDateTime(date, locale)}>
				<span className="tlui-cmt-time">
					{formatRelativeTime(date, locale)}
					{edited && <span className="tlui-cmt-edited"> · edited</span>}
				</span>
			</TldrawUiTooltip>
		</div>
	)
}
