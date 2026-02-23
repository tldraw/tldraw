import { useCallback, useRef } from 'react'
import {
	createShapeId,
	Editor,
	SVGContainer,
	TLArrowBinding,
	TLComponents,
	Tldraw,
	track,
	useEditor,
	Vec,
} from 'tldraw'
import 'tldraw/tldraw.css'

const RING_COLORS = [
	'#3b82f6', // blue
	'#ec4899', // pink
	'#22c55e', // green
	'#a855f7', // purple
	'#f97316', // orange
	'#14b8a6', // teal
	'#ef4444', // red
	'#eab308', // yellow
]

const DistanceRingsOverlay = track(() => {
	const editor = useEditor()
	const colorMap = useRef(new Map<string, string>())
	const nextColor = useRef(0)

	const arrows = editor.getCurrentPageShapes().filter((s) => s.type === 'arrow')
	const rings = []

	for (const arrow of arrows) {
		const bindings = editor.getBindingsFromShape<TLArrowBinding>(arrow.id, 'arrow')
		const startBinding = bindings.find((b) => b.props.terminal === 'start')
		const endBinding = bindings.find((b) => b.props.terminal === 'end')
		if (!startBinding || !endBinding) continue

		const startBounds = editor.getShapePageBounds(startBinding.toId)
		const endBounds = editor.getShapePageBounds(endBinding.toId)
		if (!startBounds || !endBounds) continue

		if (!colorMap.current.has(arrow.id)) {
			colorMap.current.set(arrow.id, RING_COLORS[nextColor.current % RING_COLORS.length])
			nextColor.current++
		}

		rings.push({
			sourceShapeId: startBinding.toId,
			radius: Vec.Dist(startBounds.center, endBounds.center),
			color: colorMap.current.get(arrow.id)!,
		})
	}

	return (
		<SVGContainer>
			{rings.map((ring, i) => {
				const bounds = editor.getShapePageBounds(ring.sourceShapeId)
				if (!bounds) return null
				const { x, y } = bounds.center
				return (
					<circle
						key={i}
						cx={x}
						cy={y}
						r={ring.radius}
						fill={ring.color}
						fillOpacity={0.03}
						stroke={ring.color}
						strokeWidth={1.5}
						strokeOpacity={0.5}
					/>
				)
			})}
		</SVGContainer>
	)
})

const components: TLComponents = {
	OnTheCanvas: DistanceRingsOverlay,
}

function setupInitialShapes(editor: Editor) {
	if (editor.getCurrentPageShapes().length > 0) return

	editor.createShapes([
		{
			id: createShapeId(),
			type: 'geo',
			x: 200,
			y: 200,
			props: { w: 120, h: 120, geo: 'ellipse', color: 'blue' },
		},
		{
			id: createShapeId(),
			type: 'geo',
			x: 600,
			y: 100,
			props: { w: 100, h: 80, geo: 'rectangle', color: 'red' },
		},
		{
			id: createShapeId(),
			type: 'geo',
			x: 550,
			y: 400,
			props: { w: 90, h: 90, geo: 'diamond', color: 'green' },
		},
		{
			id: createShapeId(),
			type: 'geo',
			x: 100,
			y: 450,
			props: { w: 80, h: 80, geo: 'hexagon', color: 'orange' },
		},
		{
			id: createShapeId(),
			type: 'geo',
			x: 400,
			y: 250,
			props: { w: 100, h: 100, geo: 'star', color: 'violet' },
		},
	])
}

export default function DrawingDistanceRingsWithArrowsExample() {
	const handleMount = useCallback((editor: Editor) => {
		setupInitialShapes(editor)
	}, [])

	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="drawing-distance-rings-with-arrows"
				components={components}
				onMount={handleMount}
			/>
		</div>
	)
}
