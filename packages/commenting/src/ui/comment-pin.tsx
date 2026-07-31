import { ReactNode } from 'react'
import { PinCheckIcon } from './icons'

/** @public */
export interface CommentPinProps {
	/** What the pin shows when unresolved — a number, an author initial, an <Avatar>, etc.
	 *  Left as a lever so consumers aren't locked into a count. */
	children?: ReactNode
	resolved?: boolean
	/** The pin's thread is open — shows the active/selected indicator state. */
	open?: boolean
}

/* Decorative — the pin's accessible name lives on whatever wraps it. */
const resolvedCheck = <PinCheckIcon />

/** A canvas comment marker: shows its `children` (or a check when resolved). Purely
 * presentational — it reflects open/resolved state via CSS; wrap it to make it clickable.
 * @public @react */
export function CommentPin({ children, resolved, open }: CommentPinProps) {
	const className = [
		// `tlui-cmt-marker` carries the resting shadow and the hover lift — the same treatment a
		// count badge wears, so the two markers behave alike.
		'tlui-cmt-marker',
		'tlui-cmt-pin',
		resolved && 'tlui-cmt-pin--resolved',
		open && 'tlui-cmt-marker--open',
	]
		.filter(Boolean)
		.join(' ')
	return <div className={className}>{resolved ? resolvedCheck : children}</div>
}
