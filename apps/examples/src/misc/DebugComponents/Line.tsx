import { Vec } from 'tldraw'

export function Line({
	p1,
	p2,
	style = 'dashed',
	width = 2,
	color,
}: {
	p1: Vec
	p2: Vec
	style?: string
	width?: number
	color: string
}) {
	const isHorizontal = p1.y === p2.y

	return (
		<div
			style={{
				width: Math.abs(p2.x - p1.x),
				height: Math.abs(p2.y - p1.y),
				borderTop: isHorizontal ? `${width / 2}px ${style} ${color}` : 'none',
				borderRight: isHorizontal ? 'none' : `${width / 2}px ${style} ${color}`,
				borderBottom: isHorizontal ? `${width / 2}px ${style} ${color}` : 'none',
				borderLeft: isHorizontal ? 'none' : `${width / 2}px ${style} ${color}`,
				position: 'absolute',
				transform: `translate(${Math.min(p1.x, p2.x) - (isHorizontal ? 0 : width / 2)}px, ${Math.min(p1.y, p2.y) - (isHorizontal ? width / 2 : 0)}px)`,
				background: '#ccc',
				opacity: 0.6,
				zIndex: 99998,
				pointerEvents: 'none',
				boxSizing: 'border-box',
			}}
		/>
	)
}
