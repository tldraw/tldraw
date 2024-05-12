import { BoxLike, SVGContainer } from 'tldraw'

export function SelectionBrush({ brush }: { brush: BoxLike | null }) {
	if (!brush) return null
	return (
		<SVGContainer>
			<rect
				className="tl-brush tl-brush__default"
				x={brush.x}
				y={brush.y}
				width={brush.w}
				height={brush.h}
			/>
		</SVGContainer>
	)
}
