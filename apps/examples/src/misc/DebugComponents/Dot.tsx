import { VecLike } from 'tldraw'

export function Dot({ point: { x, y }, color }: { point: VecLike; color: string }) {
	return (
		<div
			style={{
				width: 10,
				height: 10,
				borderRadius: '100%',
				position: 'absolute',
				zIndex: 99999,
				transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
				border: `2px solid ${color}`,
				backgroundColor: `color-mix(in hsl, ${color}, white 60%)`,
				opacity: 1,
				pointerEvents: 'none',
			}}
		/>
	)
}
