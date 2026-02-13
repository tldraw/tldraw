import { createShapeId, Tldraw, TldrawUiButton, TLShapeId, toRichText, useEditor } from 'tldraw'
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

	// [3] Update locked shapes using ignoreShapeLock option
	// Without ignoreShapeLock: true, these updates would be blocked
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
		<div className="tlui-menu">
			<TldrawUiButton type="normal" onClick={handleScatter}>
				Scatter
			</TldrawUiButton>
			<TldrawUiButton type="normal" onClick={handleReset}>
				Reset
			</TldrawUiButton>
		</div>
	)
}

const components = {
	TopPanel: ControlPanel,
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
This example demonstrates the key distinction between locked shapes and programmatic updates:

Locked shapes prevent ALL user interaction (dragging, deleting, etc.), but programs can still
modify them using the ignoreShapeLock option. This is useful for shapes that should be fixed
in place by the user but need to be repositioned programmatically.

[1] Pre-defined shape IDs so we can reference them later.

[2] Control panel with action buttons.

[3] Both buttons use editor.run() with { ignoreShapeLock: true } to bypass the lock constraint.
This option allows programmatic updates even though user interactions on these shapes are blocked.

[4] The main component sets up the editor.

[5] On mount, we create a 2x2 grid of template shapes.

[6] We immediately lock them with toggleLock(). The key behavior: users cannot move or delete
these shapes, but the Scatter/Reset buttons can still reposition them programmatically.

Try it:
- Try dragging any template shape (won't work - they're locked by the user interface)
- Click Scatter or Reset to see how programmatic updates work with ignoreShapeLock: true
*/
