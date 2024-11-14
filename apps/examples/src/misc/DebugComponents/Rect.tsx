import { Vec } from 'tldraw'

export function Rect({
	p1,
	p2,
	color,
	style = 'dashed',
	stroke = true,
	fill,
}: {
	p1: Vec
	p2: Vec
	style?: string
	color: string
	fill?: boolean
	stroke?: boolean
}) {
	return (
		<div
			style={{
				width: Math.abs(p2.x - p1.x),
				height: Math.abs(p2.y - p1.y),
				border: stroke ? `2px ${style} ${color}` : 'none',
				position: 'absolute',
				transform: `translate(${Math.min(p1.x, p2.x)}px, ${Math.min(p1.y, p2.y)}px)`,
				background: fill ? color : 'none',
				opacity: 0.6,
				zIndex: 99998,
				pointerEvents: 'none',
			}}
		/>
	)
}
