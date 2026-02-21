import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TLShapeId, track, useEditor, useValue } from 'tldraw'
import { useComposition } from './CompositionContext'
import { embedIdeaNodesBatch, hasCachedEmbeddings } from './embeddings'
import { getIdeaNodes } from './graph'
import { rankPairSuggestions } from './scoring'

// At zoom >= 1 show all; below 1 only keep the top N (scales with zoom²)
const LOD_BASE = 20
const LOD_MIN = 3

// Distance (in screen pixels) at which a button is fully visible
const FADE_NEAR = 100
// Distance at which a button is fully invisible
const FADE_FAR = 350
// Max opacity for non-busy buttons
const MAX_OPACITY = 1.0
// How far the bezier control point bows outward (screen pixels)
const CURVE_OFFSET = 40

function opacityForDistance(dist: number): number {
	if (dist <= FADE_NEAR) return MAX_OPACITY
	if (dist >= FADE_FAR) return 0
	return MAX_OPACITY * (1 - (dist - FADE_NEAR) / (FADE_FAR - FADE_NEAR))
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

	// Warm embedding cache for any uncached nodes
	useEffect(() => {
		const uncached = allIdeaNodes.filter((n) => !hasCachedEmbeddings(n.id))
		if (uncached.length > 0) {
			embedIdeaNodesBatch(uncached).catch(() => {})
		}
	}, [allIdeaNodes])

	const allSuggestions = useMemo(() => rankPairSuggestions(ideaNodes, Infinity), [ideaNodes])

	const camera = useValue('camera', () => editor.getCamera(), [editor])
	const zoom = useValue('zoom', () => editor.getZoomLevel(), [editor])

	// LOD: zoom >= 1.5 show all, 0.6–1.5 show most, below 0.6 cull aggressively
	const suggestions = useMemo(() => {
		if (zoom >= 1.5) return allSuggestions
		if (zoom >= 0.6) {
			// Linear blend: at 0.6 show 40%, at 1.5 show 100%
			const t = (zoom - 0.6) / (1.5 - 0.6)
			const fraction = 0.4 + 0.6 * t
			const limit = Math.max(LOD_MIN, Math.round(allSuggestions.length * fraction))
			return allSuggestions.slice(0, limit)
		}
		const limit = Math.max(LOD_MIN, Math.round(LOD_BASE * zoom * zoom))
		return allSuggestions.slice(0, limit)
	}, [allSuggestions, zoom])

	const cursorScreen = useValue(
		'cursorScreen',
		() => {
			const pt = editor.inputs.currentScreenPoint
			return { x: pt.x, y: pt.y }
		},
		[editor]
	)

	// Convert page coords to container-relative coords using camera directly
	const pageToContainer = useCallback(
		(px: number, py: number) => {
			const { x: cx, y: cy, z: cz = 1 } = camera
			return { x: (px + cx) * cz, y: (py + cy) * cz }
		},
		[camera]
	)

	const buttons = useMemo(() => {
		return suggestions
			.map((s) => {
				const boundsA = editor.getShapePageBounds(s.a.id)
				const boundsB = editor.getShapePageBounds(s.b.id)
				if (!boundsA || !boundsB) return null

				const pageMidX = (boundsA.x + boundsA.w / 2 + boundsB.x + boundsB.w / 2) / 2
				const pageMidY = (boundsA.y + boundsA.h / 2 + boundsB.y + boundsB.h / 2) / 2
				const screenMid = pageToContainer(pageMidX, pageMidY)

				const dx = screenMid.x - cursorScreen.x
				const dy = screenMid.y - cursorScreen.y
				const dist = Math.sqrt(dx * dx + dy * dy)
				const opacity = opacityForDistance(dist)

				const aScreen = pageToContainer(boundsA.x + boundsA.w / 2, boundsA.y + boundsA.h / 2)
				const bScreen = pageToContainer(boundsB.x + boundsB.w / 2, boundsB.y + boundsB.h / 2)

				return {
					key: s.pairKey,
					screenX: screenMid.x,
					screenY: screenMid.y,
					score: s.finalScore,
					aId: s.a.id,
					bId: s.b.id,
					aCx: aScreen.x,
					aCy: aScreen.y,
					bCx: bScreen.x,
					bCy: bScreen.y,
					busy: busyPairs.has(s.pairKey),
					opacity,
				}
			})
			.filter(Boolean) as Array<{
			key: string
			screenX: number
			screenY: number
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
	}, [suggestions, editor, busyPairs, cursorScreen, pageToContainer])

	const handleHover = useCallback((key: string | null) => setHoveredKey(key), [])

	const overlayRef = useRef<HTMLDivElement>(null)
	const downRef = useRef<{ x: number; y: number } | null>(null)
	const CLICK_THRESHOLD = 6

	useEffect(() => {
		const onDown = (e: PointerEvent) => {
			downRef.current = { x: e.clientX, y: e.clientY }
		}
		window.addEventListener('pointerdown', onDown, true)
		return () => window.removeEventListener('pointerdown', onDown, true)
	}, [])

	// Convert clientX/Y to container-relative coords
	const clientToContainer = useCallback((clientX: number, clientY: number) => {
		const el = overlayRef.current
		if (!el) return { x: clientX, y: clientY }
		const rect = el.getBoundingClientRect()
		return { x: clientX - rect.left, y: clientY - rect.top }
	}, [])

	const hitTest = useCallback(
		(clientX: number, clientY: number) => {
			const pt = clientToContainer(clientX, clientY)
			for (const b of buttons) {
				if (b.opacity <= 0 && !b.busy) continue
				if (b.busy) continue
				const dx = pt.x - b.screenX
				const dy = pt.y - b.screenY
				if (Math.abs(dx) <= 14 && Math.abs(dy) <= 14) return b
			}
			return null
		},
		[buttons, clientToContainer]
	)

	useEffect(() => {
		const onUp = (e: PointerEvent) => {
			const down = downRef.current
			if (!down) return
			const dist = Math.sqrt((e.clientX - down.x) ** 2 + (e.clientY - down.y) ** 2)
			if (dist > CLICK_THRESHOLD) return

			const hit = hitTest(e.clientX, e.clientY)
			if (hit) {
				handleCompose(editor, hit.key, [hit.aId, hit.bId])
			}
		}
		window.addEventListener('pointerup', onUp, true)
		return () => window.removeEventListener('pointerup', onUp, true)
	}, [hitTest, handleCompose, editor])

	if (buttons.length === 0) return null

	return (
		<div ref={overlayRef} className="ic-compose-overlay">
			{/* Connection lines layer */}
			<svg className="ic-compose-lines">
				{buttons.map((b) => {
					const showLines = b.key === hoveredKey || b.busy
					if (!showLines) return null

					const mid = { x: b.screenX, y: b.screenY }
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

			{/* Buttons layer — purely visual, no pointer events */}
			{buttons.map((b) => {
				if (b.opacity <= 0 && !b.busy) return null
				const opacity = b.busy ? 1 : b.opacity

				return (
					<div
						key={b.key}
						className="ic-compose-dot"
						style={{
							transform: `translate(${b.screenX}px, ${b.screenY}px) translate(-50%, -50%)`,
							opacity,
						}}
						onMouseEnter={() => handleHover(b.key)}
						onMouseLeave={() => handleHover(null)}
					>
						{b.busy ? (
							<div className="ic-compose-spinner" />
						) : (
							<div className="ic-compose-button">+</div>
						)}
						<div className="ic-compose-score">{b.score.toFixed(2).replace(/^0/, '')}</div>
					</div>
				)
			})}
		</div>
	)
})
