/** @public */
export interface CountBadgeProps {
	count: number
}

/** @public @react */
export function CountBadge({ count }: CountBadgeProps) {
	return <div className="tlui-cmt-count-badge">{count}</div>
}
