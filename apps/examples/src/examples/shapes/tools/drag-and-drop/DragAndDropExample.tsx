import {
	BaseFrameLikeShapeUtil,
	Circle2d,
	Geometry2d,
	Group2d,
	HTMLContainer,
	Rectangle2d,
	ShapeUtil,
	TLBaseBoxShape,
	TLShape,
	Tldraw,
	Vec,
} from 'tldraw'
import 'tldraw/tldraw.css'

const MY_GRID_SHAPE_TYPE = 'my-grid-shape'
const MY_COUNTER_SHAPE_TYPE = 'my-counter-shape'

// [1]
declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[MY_GRID_SHAPE_TYPE]: { w: number; h: number }
		[MY_COUNTER_SHAPE_TYPE]: Record<string, never>
	}
}

// [2]
type MyGridShape = TLBaseBoxShape & {
	type: typeof MY_GRID_SHAPE_TYPE
}
type MyCounterShape = TLShape<typeof MY_COUNTER_SHAPE_TYPE>

// [3]
const SLOT_SIZE = 100
class MyCounterShapeUtil extends ShapeUtil<MyCounterShape> {
	static override type = MY_COUNTER_SHAPE_TYPE

	override canResize(shape: MyCounterShape) {
		return false
	}
	override hideResizeHandles(shape: MyCounterShape) {
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

	getIndicatorPath() {
		const path = new Path2D()
		path.arc(SLOT_SIZE / 2 - 10, SLOT_SIZE / 2 - 10, SLOT_SIZE / 2 - 10, 0, Math.PI * 2)
		return path
	}
}

// [4]
class MyGridShapeUtil extends BaseFrameLikeShapeUtil<MyGridShape> {
	static override type = MY_GRID_SHAPE_TYPE

	getDefaultProps(): MyGridShape['props'] {
		return {
			w: SLOT_SIZE * 5,
			h: SLOT_SIZE * 2,
		}
	}

	override getGeometry(shape: MyGridShape): Geometry2d {
		return new Group2d({
			children: [
				new Rectangle2d({
					width: shape.props.w,
					height: shape.props.h,
					isFilled: true,
				}),
			],
		})
	}

	override canResize(_shape: MyGridShape) {
		return false
	}

	override hideResizeHandles(_shape: MyGridShape) {
		return true
	}

	// [5]
	override canReceiveNewChildrenOfType(_shape: MyGridShape, type: TLShape['type']) {
		return type === MY_COUNTER_SHAPE_TYPE
	}

	// [6]
	override canRemoveChildrenOfType(_shape: MyGridShape, type: TLShape['type']) {
		return type !== MY_COUNTER_SHAPE_TYPE
	}

	// [7]
	override getClipPath(_shape: MyGridShape): Vec[] {
		return [
			new Vec(0, 0),
			new Vec(SLOT_SIZE * 5, 0),
			new Vec(SLOT_SIZE * 5, SLOT_SIZE * 2),
			new Vec(0, SLOT_SIZE * 2),
		]
	}

	component(shape: MyGridShape) {
		return (
			<HTMLContainer
				style={{
					backgroundColor: '#efefef',
					borderRight: '1px solid #ccc',
					borderBottom: '1px solid #ccc',
					backgroundSize: `${SLOT_SIZE}px ${SLOT_SIZE}px`,
					width: shape.props.w,
					height: shape.props.h,
					backgroundImage: `
						linear-gradient(to right, #ccc 1px, transparent 1px),
						linear-gradient(to bottom, #ccc 1px, transparent 1px)
					`,
				}}
			/>
		)
	}

	override getIndicatorPath(shape: MyGridShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
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
First, we need to extend TLGlobalShapePropsMap to add our shape's props to the global type system.
This tells TypeScript about the shape's properties. Here we use Record<string, never> since our shapes
don't need any custom properties. These are very basic custom shapes: see the custom shape examples for
more complex examples.

[2]
Define the shape types using TLShape with each shape's type as a type argument.

[3]
Create a ShapeUtil for the counter shape. This defines how the shape behaves and renders. We disable resizing
and use Circle2d geometry for collision detection. The component renders as a red circle using HTMLContainer.

[4]
Create a ShapeUtil for the grid shape. This creates a rectangular grid that can accept dropped shapes. We use
Rectangle2d geometry and render it with CSS grid lines using background gradients.

[5]
Override canReceiveNewChildrenOfType to gate which shape types can be dragged into the grid. The editor only
fires onDragShapesIn for shapes that pass this check. The default is false, so any container that wants to
receive dragged shapes must override this. Here we accept counter shapes only.

[6]
Override canRemoveChildrenOfType to gate which child shape types are allowed to be dragged out. The editor
only fires onDragShapesOut for shapes that pass this check, and it also won't auto-reparent ("kick out") a
child of a blocked type when it's moved outside the parent's geometry. The default is true. Here, we don't 
allow any child counter shapes to be dragged out.

[7]
Override getClipPath so children are visually clipped to the grid's bounds while they're parented to it.
This is independent of the drag-and-drop callbacks above; it just makes it visually obvious that a counter
"belongs" to the grid while it's a child. Try dragging a counter outside the grid — because counters are
pinned, the counter stays a child of the grid and the clip path keeps it inside.
*/
