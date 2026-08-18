/** @public */
export interface CountBadgeProps {
	count: number
	/** The badge's list is showing — shows the active/selected indicator state, as an open pin does. */
	open?: boolean
}

/** @public @react */
export function CountBadge({ count, open }: CountBadgeProps) {
	// `tlui-cmt-marker` is shared with CommentPin — see comments.css
	const className = ['tlui-cmt-marker', 'tlui-cmt-count-badge', open && 'tlui-cmt-marker--open']
		.filter(Boolean)
		.join(' ')
	return <div className={className}>{count}</div>
}
