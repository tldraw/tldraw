import { Box, BoxModel, SVGContainer, useValue } from 'tldraw'

export interface AreaHighlightProps {
	pageBounds: BoxModel
	generating: boolean
	color: string
	label?: string
}

export function AreaHighlight({ pageBounds, color, generating, label }: AreaHighlightProps) {
	// Use page coordinates directly - the Overlays component transforms with the camera
	const bounds = useValue('bounds', () => Box.From(pageBounds).expandBy(4), [pageBounds])

	if (!bounds) return null
	const minX = bounds.minX
	const minY = bounds.minY
	const maxX = bounds.maxX
	const maxY = bounds.maxY

	return (
		<>
			<SVGContainer
				className={`context-highlight ${generating ? 'context-highlight-generating' : ''}`}
				style={{
					top: minY,
					left: minX,
					width: maxX - minX,
					height: maxY - minY,
				}}
			>
				{bounds.sides.map((side, j) => {
					return (
						<line
							key={'context-highlight-side-' + j}
							x1={side[0].x - bounds.minX}
							y1={side[0].y - bounds.minY}
							x2={side[1].x - bounds.minX}
							y2={side[1].y - bounds.minY}
							stroke={color}
						/>
					)
				})}
			</SVGContainer>
			{label && (
				<div
					className="context-highlight-label"
					style={{ top: bounds.y, left: bounds.x, backgroundColor: color }}
				>
					{label}
				</div>
			)}
		</>
	)
}
