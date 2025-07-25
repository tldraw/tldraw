import {
	Circle2d,
	Geometry2d,
	HTMLContainer,
	Rectangle2d,
	ShapeUtil,
	TLBaseShape,
	TLDragShapesOutInfo,
	TLShape,
	Tldraw,
} from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
type MyGridShape = TLBaseShape<'my-grid-shape', Record<string, never>>
type MyCounterShape = TLBaseShape<'my-counter-shape', Record<string, never>>

// [2]
const SLOT_SIZE = 100
class MyCounterShapeUtil extends ShapeUtil<MyCounterShape> {
	static override type = 'my-counter-shape' as const

	override canResize() {
		return false
	}
	override hideResizeHandles() {
		return true
	}

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

	override canResize() {
		return false
	}
	override hideResizeHandles() {
		return true
	}

	// [5]
	override onDragShapesIn(shape: MyGridShape, draggingShapes: TLShape[]): void {
		const { editor } = this
		const reparentingShapes = draggingShapes.filter(
			(s) => s.parentId !== shape.id && s.type === 'my-counter-shape'
		)
		if (reparentingShapes.length === 0) return
		editor.reparentShapes(reparentingShapes, shape.id)
	}

	// [6]
	override onDragShapesOut(
		shape: MyGridShape,
		draggingShapes: TLShape[],
		info: TLDragShapesOutInfo
	): void {
		const { editor } = this
		const reparentingShapes = draggingShapes.filter((s) => s.parentId !== shape.id)
		if (!info.nextDraggingOverShapeId) {
			editor.reparentShapes(reparentingShapes, editor.getCurrentPageId())
		}
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
					if (editor.getCurrentPageShapeIds().size > 0) return
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
[1]
Define custom shape types using TLBaseShape. Each shape type needs a unique identifier and can have custom 
properties. Here we use Record<string, never> since our shapes don't need any custom properties. These are 
very basic custom shapes: see the custom shape examples for more complex examples.

[2]
Create a ShapeUtil for the counter shape. This defines how the shape behaves and renders. We disable resizing 
and use Circle2d geometry for collision detection. The component renders as a red circle using HTMLContainer.

[3]
Create a ShapeUtil for the grid shape. This creates a rectangular grid that can accept dropped shapes. We use 
Rectangle2d geometry and render it with CSS grid lines using background gradients.

[5]
Override onDragShapesIn to handle when shapes are dragged into the grid. We filter for counter shapes that
aren't already children of this grid, then reparent them to become children. This makes them move with the grid. 

[6]
Override onDragShapesOut to handle when shapes are dragged out of the grid. If they're not being dragged to
another shape, we reparent them back to the page level, making them independent again.
*/
