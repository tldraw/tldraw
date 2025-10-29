import { Box, BoxModel, SVGContainer, useValue } from 'tldraw'
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
	const bounds = useValue('bounds', () => Box.From(pageBounds).expandBy(4), [pageBounds])

	if (!bounds) return null
	const minX = bounds.minX
	const minY = bounds.minY
	const maxX = bounds.maxX
	const maxY = bounds.maxY

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
