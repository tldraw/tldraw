import {
	Circle2d,
	Geometry2d,
	HTMLContainer,
	Rectangle2d,
	ShapeUtil,
	TLBaseShape,
	TLShape,
	Tldraw,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
type MyGridShape = TLBaseShape<'my-grid-shape', Record<string, never>>
type MyCounterShape = TLBaseShape<'my-counter-shape', Record<string, never>>

// [2]
const SLOT_SIZE = 100
class MyCounterShapeUtil extends ShapeUtil<MyCounterShape> {
	static override type = 'my-counter-shape' as const

	override canResize = () => false
	override hideResizeHandles = () => true

	getDefaultProps(): MyCounterShape['props'] {
		return {}
	}

	getGeometry(): Geometry2d {
		return new Circle2d({ radius: SLOT_SIZE / 2 - 10, isFilled: true })
	}

	component() {
		return (
			<HTMLContainer
				style={{
					backgroundColor: '#e03131',
					border: '1px solid #ff8787',
					borderRadius: '50%',
				}}
			/>
		)
	}

	indicator() {
		return <circle r={SLOT_SIZE / 2 - 10} cx={SLOT_SIZE / 2 - 10} cy={SLOT_SIZE / 2 - 10} />
	}
}

// [3]
class MyGridShapeUtil extends ShapeUtil<MyGridShape> {
	static override type = 'my-grid-shape' as const

	getDefaultProps(): MyGridShape['props'] {
		return {}
	}

	getGeometry(): Geometry2d {
		return new Rectangle2d({
			width: SLOT_SIZE * 5,
			height: SLOT_SIZE * 2,
			isFilled: true,
		})
	}

	override canResize = () => false
	override hideResizeHandles = () => true

	// [a]
	override canDropShapes = (shape: MyGridShape, shapes: TLShape[]) => {
		if (shapes.every((s) => s.type === 'my-counter-shape')) {
			return true
		}
		return false
	}

	// [b]
	override onDragShapesOver = (shape: MyGridShape, shapes: TLShape[]) => {
		if (!shapes.every((child) => child.parentId === shape.id)) {
			this.editor.reparentShapes(shapes, shape.id)
		}
	}

	// [c]
	override onDragShapesOut = (shape: MyGridShape, shapes: TLShape[]) => {
		this.editor.reparentShapes(shapes, this.editor.getCurrentPageId())
	}

	component() {
		return (
			<HTMLContainer
				style={{
					backgroundColor: '#efefef',
					borderRight: '1px solid #ccc',
					borderBottom: '1px solid #ccc',
					backgroundSize: `${SLOT_SIZE}px ${SLOT_SIZE}px`,
					backgroundImage: `
						linear-gradient(to right, #ccc 1px, transparent 1px),
						linear-gradient(to bottom, #ccc 1px, transparent 1px)
					`,
				}}
			/>
		)
	}

	indicator() {
		return <rect width={SLOT_SIZE * 5} height={SLOT_SIZE * 2} />
	}
}

export default function DragAndDropExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={[MyGridShapeUtil, MyCounterShapeUtil]}
				onMount={(editor) => {
					editor.createShape({ type: 'my-grid-shape', x: 100, y: 100 })
					editor.createShape({ type: 'my-counter-shape', x: 700, y: 100 })
					editor.createShape({ type: 'my-counter-shape', x: 750, y: 200 })
					editor.createShape({ type: 'my-counter-shape', x: 770, y: 300 })
				}}
			/>
		</div>
	)
}

/*

This example demonstrates how to use the drag-and-drop system.

[1] Define some shape types. For the purposes of this example, we'll define two
shapes: a grid and a counter.

[2] Make a shape util for the first shape. For this example, we'll make a simple
red circle that you drag and drop onto the other shape.

[3] Make the other shape util. In this example, we'll make a grid that you can
place the the circle counters onto.

    [a] Use the `canDropShapes` method to specify which shapes can be dropped onto
    the grid shape.

    [b] Use the `onDragShapesOver` method to reparent counters to the grid shape
    when they are dragged on top.

    [c] Use the `onDragShapesOut` method to reparent counters back to the page
    when they are dragged off.

*/
