import {
	BaseFrameLikeShapeUtil,
	Circle2d,
	Geometry2d,
	Group2d,
	HTMLContainer,
	Rectangle2d,
	ShapeUtil,
	TLShape,
	Tldraw,
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
type MyGridShape = TLShape<typeof MY_GRID_SHAPE_TYPE>
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

	// Frame-like shapes must return a Group2d: the editor's hit testing walks its children.
	override getGeometry(shape: MyGridShape): Geometry2d {
		return new Group2d({
			children: [new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })],
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

const shapeUtils = [MyGridShapeUtil, MyCounterShapeUtil]

export default function DragAndDropExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
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
First, we extend TLGlobalShapePropsMap to add our shapes' props to the global type system. The grid
has a width and height; the counter has no props at all, so we use Record<string, never>.

[2]
Define the shape types using TLShape with each shape's type as a type argument.

[3]
The counter is a plain ShapeUtil with fixed size: resizing is disabled and the geometry is a filled
Circle2d, so hit-testing follows the circle rather than its bounding box.

[4]
The grid extends BaseFrameLikeShapeUtil, which provides everything a container needs: it reparents
shapes dropped onto it in onDragShapesIn, reparents them back to the page in onDragShapesOut, clips
its children to its geometry, and treats itself as a frame for selection and erasing.

[5]
canReceiveNewChildrenOfType gates which shape types can be dropped in. The editor only calls
onDragShapesIn for shapes that pass this check. Here only counters are accepted, so dragging a geo
shape over the grid does nothing.

[6]
canRemoveChildrenOfType gates which children can be dragged out. When it returns false the editor
doesn't call onDragShapesOut and doesn't reparent the child when it's moved outside the parent's
geometry, so counters are pinned to the grid once dropped.

[7]
The grid draws its slots with CSS gradients. Because BaseFrameLikeShapeUtil clips children to the
grid's geometry, a pinned counter dragged past the edge stays a child and is clipped at the border,
which makes it obvious that it still belongs to the grid.
*/
