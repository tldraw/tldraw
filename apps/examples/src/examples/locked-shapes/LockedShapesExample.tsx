import { createShapeId, Tldraw, TLEditorComponents, TLShapeId, toRichText, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
const TEMPLATE_IDS: TLShapeId[] = [
	createShapeId('t1'),
	createShapeId('t2'),
	createShapeId('t3'),
	createShapeId('t4'),
]

// [2]
function ControlPanel() {
	const editor = useEditor()

	// [3]
	const handleScatter = () => {
		editor.run(
			() => {
				editor.updateShapes(
					TEMPLATE_IDS.map((id) => ({
						id,
						type: 'geo',
						x: 50 + Math.random() * 300,
						y: 50 + Math.random() * 300,
					}))
				)
			},
			{ ignoreShapeLock: true }
		)
	}

	const handleReset = () => {
		editor.run(
			() => {
				editor.updateShapes([
					{ id: TEMPLATE_IDS[0], type: 'geo', x: 100, y: 100 },
					{ id: TEMPLATE_IDS[1], type: 'geo', x: 250, y: 100 },
					{ id: TEMPLATE_IDS[2], type: 'geo', x: 100, y: 250 },
					{ id: TEMPLATE_IDS[3], type: 'geo', x: 250, y: 250 },
				])
			},
			{ ignoreShapeLock: true }
		)
	}

	return (
		<div
			style={{
				position: 'absolute',
				top: 12,
				left: 12,
				padding: 12,
				borderRadius: 8,
				backgroundColor: 'white',
				boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
				display: 'flex',
				gap: 8,
				zIndex: 999,
				pointerEvents: 'all',
			}}
			onPointerDown={(e) => e.stopPropagation()}
		>
			<button onClick={handleScatter}>Scatter</button>
			<button onClick={handleReset}>Reset</button>
		</div>
	)
}

const components: TLEditorComponents = {
	InFrontOfTheCanvas: ControlPanel,
}

// [4]
export default function LockedShapesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={components}
				onMount={(editor) => {
					// Skip if shapes already exist
					if (editor.getShape(TEMPLATE_IDS[0])) {
						editor.zoomToFit({ animation: { duration: 0 } })
						return
					}

					// [5] Create locked template shapes
					const shapeProps = {
						geo: 'rectangle' as const,
						w: 130,
						h: 130,
						dash: 'dashed' as const,
						color: 'light-blue' as const,
						fill: 'semi' as const,
						richText: toRichText('Locked'),
					}

					editor.createShapes([
						{ id: TEMPLATE_IDS[0], type: 'geo', x: 100, y: 100, props: shapeProps },
						{ id: TEMPLATE_IDS[1], type: 'geo', x: 250, y: 100, props: shapeProps },
						{ id: TEMPLATE_IDS[2], type: 'geo', x: 100, y: 250, props: shapeProps },
						{ id: TEMPLATE_IDS[3], type: 'geo', x: 250, y: 250, props: shapeProps },
					])

					// [6] Lock them immediately
					editor.toggleLock(TEMPLATE_IDS)
					editor.zoomToFit({ animation: { duration: 0 } })
				}}
			/>
		</div>
	)
}

/*
This example demonstrates locked shapes and the ignoreShapeLock escape hatch.

[1] Pre-defined shape IDs so we can reference them later.

[2] Control panel with Scatter/Reset buttons.

[3] Both buttons use editor.run() with { ignoreShapeLock: true } to
programmatically modify locked shapes. Without this option, updates
to locked shapes would be blocked.

[4] The main component sets up the editor.

[5] On mount, we create a 2x2 grid of template shapes.

[6] We immediately lock them with toggleLock(). Users can't move or
delete these shapes, but they can draw on top of them.

Try it:
- Drag the template shapes (won't work - they're locked!)
- Click Scatter/Reset to see ignoreShapeLock in action
*/
