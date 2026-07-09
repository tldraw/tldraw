import './comments.css'

export interface CountBadgeProps {
	count: number
}

export function CountBadge({ count }: CountBadgeProps) {
	return <div className="cmt-count-badge">{count}</div>
}
