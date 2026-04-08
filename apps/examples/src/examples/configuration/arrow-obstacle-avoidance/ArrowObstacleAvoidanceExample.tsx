import React, { useCallback } from 'react'
import {
	createShapeId,
	Editor,
	TLArrowShape,
	TLEditorComponents,
	Tldraw,
	track,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'

function handleMount(editor: Editor) {
	editor.sideEffects.registerBeforeCreateHandler('shape', (shape) => {
		if (shape.type === 'arrow') {
			return {
				...shape,
				props: {
					...shape.props,
					avoidObstacles: true,
					kind: 'elbow',
				},
			}
		}
		return shape
	})

	const leftId = createShapeId('left')
	const middleId = createShapeId('middle')
	const rightId = createShapeId('right')

	editor.createShapes([
		{
			id: leftId,
			type: 'geo',
			x: 100,
			y: 200,
			props: { w: 120, h: 80, geo: 'rectangle' },
		},
		{
			id: middleId,
			type: 'geo',
			x: 350,
			y: 200,
			props: { w: 120, h: 80, geo: 'rectangle' },
		},
		{
			id: rightId,
			type: 'geo',
			x: 600,
			y: 200,
			props: { w: 120, h: 80, geo: 'rectangle' },
		},
	])
}

// ---------------------------------------------------------------------------
// Grid overlay — rendered in front of shapes, in viewport coordinates
// ---------------------------------------------------------------------------

const PAGE_CELL_SIZE = 20
const GRID_PADDING = 20

const GridOverlay = track(function GridOverlay() {
	const editor = useEditor()

	const shapes = editor
		.getCurrentPageShapes()
		.filter(
			(s) =>
				s.type !== 'arrow' &&
				s.type !== 'group' &&
				s.type !== 'draw' &&
				s.type !== 'highlight' &&
				s.type !== 'line'
		)
	if (shapes.length === 0) return null

	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity

	const shapeBounds: { minX: number; minY: number; maxX: number; maxY: number }[] = []

	for (const shape of shapes) {
		const bounds = editor.getShapePageBounds(shape.id)
		if (!bounds) continue
		shapeBounds.push({
			minX: bounds.minX,
			minY: bounds.minY,
			maxX: bounds.maxX,
			maxY: bounds.maxY,
		})
		if (bounds.minX < minX) minX = bounds.minX
		if (bounds.minY < minY) minY = bounds.minY
		if (bounds.maxX > maxX) maxX = bounds.maxX
		if (bounds.maxY > maxY) maxY = bounds.maxY
	}

	if (shapeBounds.length === 0) return null

	const margin = Math.max(maxX - minX, maxY - minY) * 0.15
	minX -= margin
	minY -= margin
	maxX += margin
	maxY += margin

	const width = maxX - minX
	const height = maxY - minY
	const gridCols = Math.max(8, Math.min(50, Math.ceil(width / PAGE_CELL_SIZE)))
	const gridRows = Math.max(8, Math.min(50, Math.ceil(height / PAGE_CELL_SIZE)))
	const cellW = width / gridCols
	const cellH = height / gridRows

	const occupied = new Uint8Array(gridCols * gridRows)
	for (const b of shapeBounds) {
		const c0 = Math.max(0, Math.floor((b.minX - GRID_PADDING - minX) / cellW))
		const c1 = Math.min(gridCols - 1, Math.floor((b.maxX + GRID_PADDING - minX) / cellW))
		const r0 = Math.max(0, Math.floor((b.minY - GRID_PADDING - minY) / cellH))
		const r1 = Math.min(gridRows - 1, Math.floor((b.maxY + GRID_PADDING - minY) / cellH))
		for (let r = r0; r <= r1; r++) {
			for (let c = c0; c <= c1; c++) {
				occupied[r * gridCols + c] = 1
			}
		}
	}

	// Render in page space (OnTheCanvas handles camera transforms)
	const cells: React.ReactElement[] = []
	for (let row = 0; row < gridRows; row++) {
		for (let col = 0; col < gridCols; col++) {
			const isOccupied = occupied[row * gridCols + col] === 1
			cells.push(
				<rect
					key={`${col}-${row}`}
					x={col * cellW}
					y={row * cellH}
					width={cellW}
					height={cellH}
					fill={isOccupied ? 'rgba(255, 0, 0, 0.12)' : 'transparent'}
					stroke="rgba(0,0,0,0.08)"
					strokeWidth={0.5}
				/>
			)
		}
	}

	return (
		<svg
			style={{
				position: 'absolute',
				left: minX,
				top: minY,
				width: width,
				height: height,
				pointerEvents: 'none',
				overflow: 'visible',
			}}
		>
			{cells}
		</svg>
	)
})

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

function ControlButtons() {
	const editor = useEditor()

	const enableAll = useCallback(() => {
		const arrows = editor
			.getCurrentPageShapes()
			.filter((s): s is TLArrowShape => s.type === 'arrow')
		for (const arrow of arrows) {
			editor.updateShape<TLArrowShape>({
				id: arrow.id,
				type: 'arrow',
				props: { avoidObstacles: true, kind: 'elbow' },
			})
		}
	}, [editor])

	const disableAll = useCallback(() => {
		const arrows = editor
			.getCurrentPageShapes()
			.filter((s): s is TLArrowShape => s.type === 'arrow')
		for (const arrow of arrows) {
			editor.updateShape<TLArrowShape>({
				id: arrow.id,
				type: 'arrow',
				props: { avoidObstacles: false },
			})
		}
	}, [editor])

	return (
		<div
			style={{
				position: 'absolute',
				top: 60,
				left: 10,
				zIndex: 1000,
				display: 'flex',
				gap: 8,
			}}
		>
			<button onClick={enableAll} style={{ padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}>
				Enable avoidObstacles
			</button>
			<button onClick={disableAll} style={{ padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}>
				Disable avoidObstacles
			</button>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const components: TLEditorComponents = {
	OnTheCanvas: GridOverlay,
}

export default function ArrowObstacleAvoidanceExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw onMount={handleMount} components={components}>
				<ControlButtons />
			</Tldraw>
		</div>
	)
}
