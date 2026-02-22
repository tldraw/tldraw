import { useEffect, useRef } from 'react'
import { TLShapeId, Tldraw, VecLike, createShapeId, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import { FlowerShapeUtil, WatercolorTrailShapeUtil } from './shapes'
import { noise1D } from './watercolor'

const shapeUtils = [WatercolorTrailShapeUtil, FlowerShapeUtil]

const WATERCOLOR_COLORS = ['light-blue', 'light-violet', 'light-green', 'light-red', 'peach']
const FLOWER_COLORS = ['pink', 'lavender', 'peach', 'coral', 'rose', 'blush', 'lilac', 'mauve']
const FLOWER_SPACING_MIN = 80
const FLOWER_SPACING_MAX = 140
const FLOWER_PERP_SPREAD = 50
const MIN_POINT_DIST = 4
const WATERCOLOR_UPDATE_INTERVAL = 3
const POINT_DOWNSAMPLE = 2

interface ActiveStroke {
	drawShapeId: string
	watercolorId: string
	trackedPoints: VecLike[]
	totalDistance: number
	lastFlowerDistance: number
	nextFlowerAt: number
	watercolorColor: string
	originX: number
	originY: number
}

function WatercolorFlowersEffect() {
	const editor = useEditor()
	const activeStrokeRef = useRef<ActiveStroke | null>(null)
	const managedIdsRef = useRef(new Set<string>())
	const colorIndexRef = useRef(0)
	const tickCounterRef = useRef(0)
	const flowerSeedRef = useRef(0)

	useEffect(() => {
		editor.setCurrentTool('draw')

		const removeCreate = editor.sideEffects.registerAfterCreateHandler('shape', (record) => {
			if (record.type !== 'draw') return
			if (managedIdsRef.current.has(record.id)) return

			const wcColor = WATERCOLOR_COLORS[colorIndexRef.current % WATERCOLOR_COLORS.length]
			colorIndexRef.current++

			const wcId = createShapeId()
			managedIdsRef.current.add(wcId)

			editor.createShapes([
				{
					id: wcId,
					type: 'watercolor-trail',
					x: record.x,
					y: record.y,
					props: { points: [], color: wcColor },
				},
			])
			editor.sendToBack([wcId])

			// Hide the draw shape — only watercolor is visible
			editor.updateShapes([{ id: record.id, type: 'draw', opacity: 0 }])

			const flowerSpacing =
				FLOWER_SPACING_MIN + Math.random() * (FLOWER_SPACING_MAX - FLOWER_SPACING_MIN)

			activeStrokeRef.current = {
				drawShapeId: record.id,
				watercolorId: wcId,
				trackedPoints: [],
				totalDistance: 0,
				lastFlowerDistance: 0,
				nextFlowerAt: flowerSpacing * 0.5,
				watercolorColor: wcColor,
				originX: record.x,
				originY: record.y,
			}
		})

		const removeDelete = editor.sideEffects.registerAfterDeleteHandler('shape', (record) => {
			if (record.type !== 'draw') return
			const active = activeStrokeRef.current
			if (active && active.drawShapeId === record.id) {
				activeStrokeRef.current = null
			}
		})

		function onTick() {
			const active = activeStrokeRef.current
			if (!active) return

			const drawShape = editor.getShape(active.drawShapeId as TLShapeId)
			if (!drawShape) {
				activeStrokeRef.current = null
				return
			}

			if ((drawShape.props as any).isComplete) {
				updateWatercolor(active)
				// Delete the hidden draw shape now that watercolor is finalised
				editor.deleteShapes([active.drawShapeId as TLShapeId])
				activeStrokeRef.current = null
				return
			}

			tickCounterRef.current++
			if (tickCounterRef.current % WATERCOLOR_UPDATE_INTERVAL !== 0) return
			if (!editor.getPath().endsWith('.drawing')) return

			const pagePoint = editor.inputs.currentPagePoint
			const localPoint = {
				x: pagePoint.x - active.originX,
				y: pagePoint.y - active.originY,
			}

			const pts = active.trackedPoints
			if (pts.length > 0) {
				const last = pts[pts.length - 1]
				const dx = localPoint.x - last.x
				const dy = localPoint.y - last.y
				const dist = Math.sqrt(dx * dx + dy * dy)
				if (dist < MIN_POINT_DIST) return
				active.totalDistance += dist
			}

			pts.push(localPoint)
			updateWatercolor(active)

			while (active.totalDistance >= active.nextFlowerAt) {
				spawnFlower(active, pagePoint)
				const spacing =
					FLOWER_SPACING_MIN + Math.random() * (FLOWER_SPACING_MAX - FLOWER_SPACING_MIN)
				active.nextFlowerAt += spacing
			}
		}

		editor.on('tick', onTick)

		function updateWatercolor(active: ActiveStroke) {
			const pts = active.trackedPoints
			if (pts.length < 2) return

			const downsampled: VecLike[] = [pts[0]]
			for (let i = POINT_DOWNSAMPLE; i < pts.length; i += POINT_DOWNSAMPLE) {
				downsampled.push(pts[i])
			}
			const last = pts[pts.length - 1]
			if (downsampled[downsampled.length - 1] !== last) {
				downsampled.push(last)
			}

			editor.updateShapes([
				{
					id: active.watercolorId as any,
					type: 'watercolor-trail',
					x: active.originX,
					y: active.originY,
					props: { points: downsampled },
				},
			])
		}

		function spawnFlower(active: ActiveStroke, currentPagePoint: VecLike) {
			const pts = active.trackedPoints
			if (pts.length < 2) return

			const lastIdx = pts.length - 1
			const dx = pts[lastIdx].x - pts[lastIdx - 1].x
			const dy = pts[lastIdx].y - pts[lastIdx - 1].y
			const len = Math.sqrt(dx * dx + dy * dy)
			if (len < 0.1) return

			const nx = -dy / len
			const ny = dx / len

			const perpOffset = (Math.random() - 0.5) * 2 * FLOWER_PERP_SPREAD
			const flowerX = currentPagePoint.x + nx * perpOffset
			const flowerY = currentPagePoint.y + ny * perpOffset

			const seed = flowerSeedRef.current++
			const flowerSize = 8 + noise1D(seed, 42) * 12
			const rotation = noise1D(seed, 99) * Math.PI * 2
			const color = FLOWER_COLORS[Math.floor(noise1D(seed, 77) * FLOWER_COLORS.length)]

			const flowerId = createShapeId()
			managedIdsRef.current.add(flowerId)

			editor.createShapes([
				{
					id: flowerId,
					type: 'flower',
					x: flowerX,
					y: flowerY,
					props: { size: flowerSize, rotation, color, seed },
				},
			])
			editor.sendToBack([flowerId])
		}

		return () => {
			removeCreate()
			removeDelete()
			editor.off('tick', onTick)
		}
	}, [editor])

	return null
}

export default function WatercolorFlowersExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				onMount={(editor) => {
					editor.setCurrentTool('draw')
				}}
			>
				<WatercolorFlowersEffect />
			</Tldraw>
		</div>
	)
}
