import { ReactNode } from 'react'

/** @public */
export interface CommentPinProps {
	/** What the pin shows when unresolved — a number, an author initial, an <Avatar>, etc.
	 *  Left as a lever so consumers aren't locked into a count. */
	children?: ReactNode
	resolved?: boolean
	/** The pin's thread is open — shows the active/selected indicator state. */
	open?: boolean
}

/**
 * A canvas comment marker: shows its `children` (or a check when resolved). Purely
 * presentational — it reflects open/resolved state via CSS; wrap it to make it clickable.
 * @public
 * @react
 */
export function CommentPin({ children, resolved, open }: CommentPinProps) {
	const className = ['cmt-pin', resolved && 'cmt-pin--resolved', open && 'cmt-pin--open']
		.filter(Boolean)
		.join(' ')
	return <div className={className}>{resolved ? '✓' : children}</div>
}
