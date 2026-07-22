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

/* An inline check, not a text glyph — the '✓' character sits off-baseline and varies by font. */
const resolvedCheck = (
	<svg
		viewBox="0 0 24 24"
		width="15"
		height="15"
		fill="none"
		stroke="currentColor"
		strokeWidth="2.5"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M4 12.5l5 5L20 6.5" />
	</svg>
)

/** A canvas comment marker: shows its `children` (or a check when resolved). Purely
 * presentational — it reflects open/resolved state via CSS; wrap it to make it clickable.
 * @public @react */
export function CommentPin({ children, resolved, open }: CommentPinProps) {
	const className = [
		'tlui-cmt-pin',
		resolved && 'tlui-cmt-pin--resolved',
		open && 'tlui-cmt-pin--open',
	]
		.filter(Boolean)
		.join(' ')
	return <div className={className}>{resolved ? resolvedCheck : children}</div>
}
