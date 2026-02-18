import { useCallback, useMemo, useState } from 'react'
import { TLShapeId, track, useEditor, useValue } from 'tldraw'
import { useComposition } from './CompositionContext'
import { getIdeaNodes } from './graph'
import { rankPairSuggestions } from './scoring'

const MAX_SUGGESTIONS = 8

// Distance (in page units) at which a button is fully visible
const FADE_NEAR = 60
// Distance at which a button is fully invisible
const FADE_FAR = 300
// How far the bezier control point bows outward (page units)
const CURVE_OFFSET = 60

function opacityForDistance(dist: number): number {
	if (dist <= FADE_NEAR) return 1
	if (dist >= FADE_FAR) return 0
	return 1 - (dist - FADE_NEAR) / (FADE_FAR - FADE_NEAR)
}

/** Quadratic bezier path from `from` to `to`, bowed perpendicular by `offset`. */
function curvedPath(
	from: { x: number; y: number },
	to: { x: number; y: number },
	offset: number
): string {
	const mx = (from.x + to.x) / 2
	const my = (from.y + to.y) / 2
	const dx = to.x - from.x
	const dy = to.y - from.y
	const len = Math.sqrt(dx * dx + dy * dy) || 1
	// Perpendicular unit vector
	const nx = -dy / len
	const ny = dx / len
	const cx = mx + nx * offset
	const cy = my + ny * offset
	return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`
}

export const CompositionOverlay = track(function CompositionOverlay() {
	const editor = useEditor()
	const { domain, busyPairs, handleCompose } = useComposition()
	const [hoveredKey, setHoveredKey] = useState<string | null>(null)

	const allIdeaNodes = useValue('ideaNodes', () => getIdeaNodes(editor), [editor])
	const ideaNodes = useMemo(
		() => allIdeaNodes.filter((n) => n.domain === domain),
		[allIdeaNodes, domain]
	)

	const suggestions = useMemo(() => rankPairSuggestions(ideaNodes, MAX_SUGGESTIONS), [ideaNodes])

	const zoom = useValue('zoom', () => editor.getZoomLevel(), [editor])

	const cursorPage = useValue(
		'cursorPage',
		() => {
			const pt = editor.inputs.currentPagePoint
			return { x: pt.x, y: pt.y }
		},
		[editor]
	)

	const buttons = useMemo(() => {
		return suggestions
			.map((s) => {
				const boundsA = editor.getShapePageBounds(s.a.id)
				const boundsB = editor.getShapePageBounds(s.b.id)
				if (!boundsA || !boundsB) return null

				const pageX = (boundsA.x + boundsA.w / 2 + boundsB.x + boundsB.w / 2) / 2
				const pageY = (boundsA.y + boundsA.h / 2 + boundsB.y + boundsB.h / 2) / 2

				const dx = pageX - cursorPage.x
				const dy = pageY - cursorPage.y
				const dist = Math.sqrt(dx * dx + dy * dy)
				const opacity = opacityForDistance(dist)

				// Centers of parent shapes (for connection lines)
				const aCx = boundsA.x + boundsA.w / 2
				const aCy = boundsA.y + boundsA.h / 2
				const bCx = boundsB.x + boundsB.w / 2
				const bCy = boundsB.y + boundsB.h / 2

				return {
					key: s.pairKey,
					pageX,
					pageY,
					score: s.finalScore,
					aId: s.a.id,
					bId: s.b.id,
					aCx,
					aCy,
					bCx,
					bCy,
					busy: busyPairs.has(s.pairKey),
					opacity,
				}
			})
			.filter(Boolean) as Array<{
			key: string
			pageX: number
			pageY: number
			score: number
			aId: TLShapeId
			bId: TLShapeId
			aCx: number
			aCy: number
			bCx: number
			bCy: number
			busy: boolean
			opacity: number
		}>
	}, [suggestions, editor, busyPairs, cursorPage])

	const handleHover = useCallback((key: string | null) => setHoveredKey(key), [])

	if (buttons.length === 0) return null

	const inverseScale = 1 / zoom

	return (
		<>
			{/* Connection lines layer — lives in page coords, no inverse scale */}
			<svg className="ic-compose-lines">
				{buttons.map((b) => {
					const showLines = b.key === hoveredKey || b.busy
					if (!showLines) return null

					const mid = { x: b.pageX, y: b.pageY }
					const pathA = curvedPath({ x: b.aCx, y: b.aCy }, mid, CURVE_OFFSET)
					const pathB = curvedPath({ x: b.bCx, y: b.bCy }, mid, -CURVE_OFFSET)

					return (
						<g key={b.key} className={b.busy ? 'ic-compose-line-busy' : 'ic-compose-line-hover'}>
							<path d={pathA} />
							<path d={pathB} />
						</g>
					)
				})}
			</svg>

			{/* Buttons layer */}
			{buttons.map((b) => {
				if (b.opacity <= 0 && !b.busy) return null
				const opacity = b.busy ? 1 : b.opacity

				return (
					<div
						key={b.key}
						className="ic-compose-dot"
						style={{
							transform: `translate(${b.pageX}px, ${b.pageY}px) scale(${inverseScale}) translate(-50%, -50%)`,
							opacity,
							pointerEvents: opacity > 0.1 ? 'all' : 'none',
						}}
						onPointerEnter={() => handleHover(b.key)}
						onPointerLeave={() => handleHover(null)}
					>
						{b.busy ? (
							<div className="ic-compose-spinner" />
						) : (
							<button
								className="ic-compose-button"
								onPointerDown={(e) => {
									e.stopPropagation()
									handleCompose(editor, b.key, [b.aId, b.bId])
								}}
							>
								+
							</button>
						)}
						<div className="ic-compose-score">{b.score.toFixed(2).replace(/^0/, '')}</div>
					</div>
				)
			})}
		</>
	)
})
