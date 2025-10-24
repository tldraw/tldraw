import { Box, BoxModel, SVGContainer, useEditor, useValue } from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'

export function FairyVision({ agents }: { agents: FairyAgent[] }) {
	return (
		<>
			{agents.map((agent, i) => (
				<AgentVision key={i} agent={agent} />
			))}
		</>
	)
}

function AgentVision({ agent }: { agent: FairyAgent }) {
	const activeRequest = useValue(agent.$activeRequest)

	if (!activeRequest) return null
	return (
		<AreaHighlight
			className="blurry-vision-highlight"
			pageBounds={activeRequest.bounds}
			color="var(--tl-color-selected)"
			generating={true}
		/>
	)
}

interface AreaHighlightProps {
	pageBounds: BoxModel
	generating: boolean
	color: string
	label?: string
	className?: string
}

export function AreaHighlight({
	pageBounds,
	color,
	generating,
	label,
	className = '',
}: AreaHighlightProps) {
	const editor = useEditor()
	const screenBounds = useValue(
		'screenBounds',
		() => {
			const expandedPageBounds = Box.From(pageBounds).expandBy(4)
			const screenCorners = expandedPageBounds.corners.map((corner) => {
				return editor.pageToViewport(corner)
			})
			return Box.FromPoints(screenCorners)
		},
		[pageBounds]
	)

	if (!screenBounds) return null
	const minX = screenBounds.minX
	const minY = screenBounds.minY
	const maxX = screenBounds.maxX
	const maxY = screenBounds.maxY

	return (
		<>
			<SVGContainer
				className={`context-highlight ${generating ? 'context-highlight-generating' : ''} ${className}`}
				style={{
					top: minY,
					left: minX,
					width: maxX - minX,
					height: maxY - minY,
				}}
			>
				{screenBounds.sides.map((side, j) => {
					return (
						<line
							key={'context-highlight-side-' + j}
							x1={side[0].x - screenBounds.minX}
							y1={side[0].y - screenBounds.minY}
							x2={side[1].x - screenBounds.minX}
							y2={side[1].y - screenBounds.minY}
							stroke={color}
						/>
					)
				})}
			</SVGContainer>
			{label && (
				<div
					className="context-highlight-label"
					style={{ top: screenBounds.y, left: screenBounds.x, backgroundColor: color }}
				>
					{label}
				</div>
			)}
		</>
	)
}
