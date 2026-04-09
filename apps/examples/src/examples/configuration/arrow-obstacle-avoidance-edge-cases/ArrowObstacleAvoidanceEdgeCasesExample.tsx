import React, { useCallback, useRef, useState } from 'react'
import {
	createShapeId,
	Editor,
	TLArrowShape,
	TLEditorComponents,
	TLShapeId,
	Tldraw,
	track,
	useEditor,
	Vec,
} from 'tldraw'
import 'tldraw/tldraw.css'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _nextId = 0
function nextId(prefix = 'edge-case') {
	return createShapeId(`${prefix}-${_nextId++}`)
}

function createArrowBetween(
	editor: Editor,
	startId: TLShapeId,
	endId: TLShapeId,
	opts?: { avoidObstacles?: boolean }
) {
	const avoidObstacles = opts?.avoidObstacles ?? true
	const startBounds = editor.getShapePageBounds(startId)
	const endBounds = editor.getShapePageBounds(endId)
	if (!startBounds || !endBounds) return

	const arrowId = nextId('arrow')
	const pos = Vec.Min(startBounds.center, endBounds.center)

	editor.createShape({
		id: arrowId,
		type: 'arrow',
		x: pos.x,
		y: pos.y,
		props: {
			kind: 'elbow',
			start: { x: 0, y: 0 },
			end: { x: 10, y: 10 },
		},
	})
	// Set avoidObstacles separately — createShape's strict types don't include it
	editor.updateShape<TLArrowShape>({
		id: arrowId,
		type: 'arrow',
		props: { avoidObstacles },
	})
	editor.createBindings([
		{
			fromId: arrowId,
			toId: startId,
			type: 'arrow',
			props: {
				terminal: 'start' as const,
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isExact: false,
				isPrecise: false,
				snap: 'center' as const,
			},
		},
		{
			fromId: arrowId,
			toId: endId,
			type: 'arrow',
			props: {
				terminal: 'end' as const,
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isExact: false,
				isPrecise: false,
				snap: 'center' as const,
			},
		},
	])
	return arrowId
}

// ---------------------------------------------------------------------------
// Scenario builders — each creates a specific edge case at a given offset
// ---------------------------------------------------------------------------

type Scenario = {
	name: string
	description: string
	build: (editor: Editor, ox: number, oy: number) => void
}

const SCENARIOS: Scenario[] = [
	{
		name: 'Narrow gap',
		description:
			'Obstacle between shapes with only a 10px gap. Grid cells are 20px — can the path fit?',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			const obstacle = nextId()
			editor.createShapes([
				{ id: a, type: 'geo', x: ox, y: oy, props: { w: 100, h: 80, geo: 'rectangle' } },
				{
					id: obstacle,
					type: 'geo',
					x: ox + 110,
					y: oy - 20,
					props: { w: 80, h: 120, geo: 'rectangle' },
				},
				{ id: b, type: 'geo', x: ox + 200, y: oy, props: { w: 100, h: 80, geo: 'rectangle' } },
			])
			createArrowBetween(editor, a, b)
		},
	},
	{
		name: 'Touching shapes',
		description: 'Obstacle directly touching both source and target (0px gap).',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			const obstacle = nextId()
			editor.createShapes([
				{ id: a, type: 'geo', x: ox, y: oy, props: { w: 100, h: 80, geo: 'rectangle' } },
				{
					id: obstacle,
					type: 'geo',
					x: ox + 100,
					y: oy,
					props: { w: 100, h: 80, geo: 'rectangle' },
				},
				{ id: b, type: 'geo', x: ox + 200, y: oy, props: { w: 100, h: 80, geo: 'rectangle' } },
			])
			createArrowBetween(editor, a, b)
		},
	},
	{
		name: 'Overlapping shapes',
		description: 'Source and target overlap each other with obstacle between.',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			const obstacle = nextId()
			editor.createShapes([
				{ id: a, type: 'geo', x: ox, y: oy, props: { w: 120, h: 80, geo: 'rectangle' } },
				{
					id: obstacle,
					type: 'geo',
					x: ox + 80,
					y: oy + 10,
					props: { w: 60, h: 60, geo: 'rectangle' },
				},
				{ id: b, type: 'geo', x: ox + 100, y: oy, props: { w: 120, h: 80, geo: 'rectangle' } },
			])
			createArrowBetween(editor, a, b)
		},
	},
	{
		name: 'Horizontally aligned',
		description: 'Three shapes perfectly aligned on Y axis — tests horizontal routing preference.',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			const obs1 = nextId()
			const obs2 = nextId()
			editor.createShapes([
				{ id: a, type: 'geo', x: ox, y: oy, props: { w: 80, h: 80, geo: 'rectangle' } },
				{
					id: obs1,
					type: 'geo',
					x: ox + 140,
					y: oy,
					props: { w: 80, h: 80, geo: 'rectangle' },
				},
				{
					id: obs2,
					type: 'geo',
					x: ox + 280,
					y: oy,
					props: { w: 80, h: 80, geo: 'rectangle' },
				},
				{ id: b, type: 'geo', x: ox + 420, y: oy, props: { w: 80, h: 80, geo: 'rectangle' } },
			])
			createArrowBetween(editor, a, b)
		},
	},
	{
		name: 'Vertically aligned',
		description: 'Shapes stacked vertically — tests vertical routing preference.',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			const obs = nextId()
			editor.createShapes([
				{ id: a, type: 'geo', x: ox, y: oy, props: { w: 80, h: 60, geo: 'rectangle' } },
				{
					id: obs,
					type: 'geo',
					x: ox,
					y: oy + 100,
					props: { w: 80, h: 60, geo: 'rectangle' },
				},
				{ id: b, type: 'geo', x: ox, y: oy + 200, props: { w: 80, h: 60, geo: 'rectangle' } },
			])
			createArrowBetween(editor, a, b)
		},
	},
	{
		name: 'Enclosed target',
		description: 'Target is surrounded by obstacles on all sides. Should gracefully fallback.',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			// Walls around target
			const top = nextId()
			const bottom = nextId()
			const left = nextId()
			const right = nextId()
			const cx = ox + 250
			const cy = oy + 40
			editor.createShapes([
				{ id: a, type: 'geo', x: ox, y: oy + 20, props: { w: 80, h: 60, geo: 'rectangle' } },
				{ id: b, type: 'geo', x: cx, y: cy, props: { w: 60, h: 60, geo: 'rectangle' } },
				// Walls
				{
					id: top,
					type: 'geo',
					x: cx - 20,
					y: cy - 40,
					props: { w: 100, h: 20, geo: 'rectangle' },
				},
				{
					id: bottom,
					type: 'geo',
					x: cx - 20,
					y: cy + 80,
					props: { w: 100, h: 20, geo: 'rectangle' },
				},
				{
					id: left,
					type: 'geo',
					x: cx - 40,
					y: cy - 20,
					props: { w: 20, h: 120, geo: 'rectangle' },
				},
				{
					id: right,
					type: 'geo',
					x: cx + 80,
					y: cy - 20,
					props: { w: 20, h: 120, geo: 'rectangle' },
				},
			])
			createArrowBetween(editor, a, b)
		},
	},
	{
		name: 'Non-rectangular shapes',
		description: 'Circle and diamond obstacles — tests AABB over-padding.',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			const circle = nextId()
			const diamond = nextId()
			editor.createShapes([
				{ id: a, type: 'geo', x: ox, y: oy, props: { w: 80, h: 80, geo: 'rectangle' } },
				{
					id: circle,
					type: 'geo',
					x: ox + 140,
					y: oy - 10,
					props: { w: 100, h: 100, geo: 'ellipse' },
				},
				{
					id: diamond,
					type: 'geo',
					x: ox + 300,
					y: oy - 10,
					props: { w: 100, h: 100, geo: 'diamond' },
				},
				{ id: b, type: 'geo', x: ox + 460, y: oy, props: { w: 80, h: 80, geo: 'rectangle' } },
			])
			createArrowBetween(editor, a, b)
		},
	},
	{
		name: 'Multiple arrows same pair',
		description: 'Two arrows between the same shapes — tests if paths overlap or separate.',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			const obs = nextId()
			editor.createShapes([
				{ id: a, type: 'geo', x: ox, y: oy, props: { w: 80, h: 80, geo: 'rectangle' } },
				{
					id: obs,
					type: 'geo',
					x: ox + 140,
					y: oy,
					props: { w: 80, h: 80, geo: 'rectangle' },
				},
				{ id: b, type: 'geo', x: ox + 280, y: oy, props: { w: 80, h: 80, geo: 'rectangle' } },
			])
			createArrowBetween(editor, a, b)
			createArrowBetween(editor, a, b)
		},
	},
	{
		name: 'Chain A -> B -> C',
		description: 'Arrow chain through intermediate shapes. Moving B should reroute both arrows.',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			const c = nextId()
			const obs = nextId()
			editor.createShapes([
				{ id: a, type: 'geo', x: ox, y: oy, props: { w: 80, h: 60, geo: 'rectangle' } },
				{ id: b, type: 'geo', x: ox + 200, y: oy, props: { w: 80, h: 60, geo: 'rectangle' } },
				{ id: c, type: 'geo', x: ox + 400, y: oy, props: { w: 80, h: 60, geo: 'rectangle' } },
				{
					id: obs,
					type: 'geo',
					x: ox + 100,
					y: oy + 80,
					props: { w: 200, h: 40, geo: 'rectangle' },
				},
			])
			createArrowBetween(editor, a, b)
			createArrowBetween(editor, b, c)
		},
	},
	{
		name: 'Large obstacle',
		description: 'One very large obstacle between two small shapes.',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			const big = nextId()
			editor.createShapes([
				{ id: a, type: 'geo', x: ox, y: oy + 80, props: { w: 60, h: 40, geo: 'rectangle' } },
				{
					id: big,
					type: 'geo',
					x: ox + 100,
					y: oy,
					props: { w: 200, h: 200, geo: 'rectangle' },
				},
				{
					id: b,
					type: 'geo',
					x: ox + 340,
					y: oy + 80,
					props: { w: 60, h: 40, geo: 'rectangle' },
				},
			])
			createArrowBetween(editor, a, b)
		},
	},
	{
		name: 'Maze-like dense',
		description: 'Many small obstacles forming a maze — stress test for A* pathfinding.',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			const shapes: Parameters<Editor['createShapes']>[0] = [
				{ id: a, type: 'geo', x: ox, y: oy + 60, props: { w: 50, h: 40, geo: 'rectangle' } },
				{
					id: b,
					type: 'geo',
					x: ox + 400,
					y: oy + 60,
					props: { w: 50, h: 40, geo: 'rectangle' },
				},
			]
			// Create a grid of small obstacles with gaps
			for (let row = 0; row < 3; row++) {
				for (let col = 0; col < 5; col++) {
					// Leave some gaps for pathfinding
					if ((row + col) % 2 === 0) continue
					shapes.push({
						id: nextId(),
						type: 'geo',
						x: ox + 80 + col * 60,
						y: oy + row * 55,
						props: { w: 40, h: 35, geo: 'rectangle' },
					})
				}
			}
			editor.createShapes(shapes)
			createArrowBetween(editor, a, b)
		},
	},
	{
		name: 'With vs without avoidance',
		description: 'Same layout, one arrow with avoidance ON and one OFF for comparison.',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			const obs = nextId()
			editor.createShapes([
				{ id: a, type: 'geo', x: ox, y: oy, props: { w: 80, h: 80, geo: 'rectangle' } },
				{
					id: obs,
					type: 'geo',
					x: ox + 140,
					y: oy,
					props: { w: 80, h: 80, geo: 'rectangle' },
				},
				{ id: b, type: 'geo', x: ox + 280, y: oy, props: { w: 80, h: 80, geo: 'rectangle' } },
			])
			createArrowBetween(editor, a, b, { avoidObstacles: true })
			createArrowBetween(editor, a, b, { avoidObstacles: false })
		},
	},
]

// ---------------------------------------------------------------------------
// Grid overlay (reused from main example)
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
				width,
				height,
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

function Controls({
	onLoadScenario,
	showGrid,
	setShowGrid,
}: {
	onLoadScenario: (index: number | 'all') => void
	showGrid: boolean
	setShowGrid: (v: boolean) => void
}) {
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
				flexDirection: 'column',
				gap: 6,
				maxHeight: 'calc(100vh - 80px)',
				overflowY: 'auto',
				background: 'white',
				borderRadius: 8,
				padding: 8,
				boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
				fontSize: 12,
				width: 220,
			}}
		>
			<div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>Edge cases</div>
			<div style={{ display: 'flex', gap: 4 }}>
				<button onClick={enableAll} style={btnStyle}>
					Enable all
				</button>
				<button onClick={disableAll} style={btnStyle}>
					Disable all
				</button>
			</div>
			<label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
				<input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
				Show debug grid
			</label>
			<hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #eee' }} />
			<button onClick={() => onLoadScenario('all')} style={{ ...btnStyle, fontWeight: 'bold' }}>
				Load all scenarios
			</button>
			{SCENARIOS.map((s, i) => (
				<button key={i} onClick={() => onLoadScenario(i)} style={btnStyle} title={s.description}>
					{s.name}
				</button>
			))}
		</div>
	)
}

const btnStyle: React.CSSProperties = {
	padding: '4px 8px',
	fontSize: 11,
	cursor: 'pointer',
	textAlign: 'left',
	border: '1px solid #ddd',
	borderRadius: 4,
	background: '#fafafa',
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function ArrowObstacleAvoidanceEdgeCasesExample() {
	const editorRef = useRef<Editor | null>(null)
	const [showGrid, setShowGrid] = useState(true)

	const handleMount = useCallback((editor: Editor) => {
		editorRef.current = editor
		// Auto-enable avoidance on new arrows
		editor.sideEffects.registerBeforeCreateHandler('shape', (shape) => {
			if (shape.type === 'arrow') {
				return {
					...shape,
					props: { ...shape.props, avoidObstacles: true, kind: 'elbow' },
				}
			}
			return shape
		})
	}, [])

	const loadScenario = useCallback((index: number | 'all') => {
		const editor = editorRef.current
		if (!editor) return
		// Clear existing shapes
		const ids = Array.from(editor.getCurrentPageShapeIds())
		if (ids.length > 0) editor.deleteShapes(ids)
		_nextId = 0

		if (index === 'all') {
			// Layout all scenarios in a grid, 3 per row
			const cols = 3
			const spacingX = 600
			const spacingY = 350
			SCENARIOS.forEach((s, i) => {
				const col = i % cols
				const row = Math.floor(i / cols)
				s.build(editor, col * spacingX + 40, row * spacingY + 40)
			})
			editor.zoomToFit({ animation: { duration: 300 } })
		} else {
			SCENARIOS[index].build(editor, 100, 100)
			editor.zoomToFit({ animation: { duration: 300 } })
		}
	}, [])

	const components: TLEditorComponents = {
		OnTheCanvas: showGrid ? GridOverlay : undefined,
	}

	return (
		<div className="tldraw__editor">
			<Tldraw onMount={handleMount} components={components}>
				<Controls onLoadScenario={loadScenario} showGrid={showGrid} setShowGrid={setShowGrid} />
			</Tldraw>
		</div>
	)
}
