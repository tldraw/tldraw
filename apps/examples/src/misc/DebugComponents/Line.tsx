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
	return (
		<div
			style={{
				width: Math.abs(p2.x - p1.x),
				height: Math.abs(p2.y - p1.y),
				borderLeft: Math.abs(p2.y - p1.y) ? `${width}px ${style} ${color}` : 'none',
				borderBottom: Math.abs(p2.x - p1.x) ? `${width}px ${style} ${color}` : 'none',
				position: 'absolute',
				transform: `translate(${Math.min(p1.x, p2.x)}px, ${Math.min(p1.y, p2.y)}px)`,
				background: '#ccc',
				opacity: 0.6,
				zIndex: 99998,
				pointerEvents: 'none',
			}}
		/>
	)
}
