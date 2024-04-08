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

const COUNTER_SIZE = 100

class MyCounterShapeUtil extends ShapeUtil<MyCounterShape> {
	static override type = 'my-counter-shape' as const

	override canResize = () => false
	override hideResizeHandles = () => true

	getDefaultProps(): MyCounterShape['props'] {
		return {}
	}

	getGeometry(): Geometry2d {
		return new Circle2d({ radius: COUNTER_SIZE / 2 - 10, isFilled: true })
	}

	component() {
		return (
			<HTMLContainer
				style={{
					backgroundColor: '#e03131',
					border: '1px solid #ff8787',
					borderRadius: '50%',
				}}
			></HTMLContainer>
		)
	}

	indicator() {
		return (
			<circle r={COUNTER_SIZE / 2 - 10} cx={COUNTER_SIZE / 2 - 10} cy={COUNTER_SIZE / 2 - 10} />
		)
	}
}

class MyGridShapeUtil extends ShapeUtil<MyGridShape> {
	static override type = 'my-grid-shape' as const

	getDefaultProps(): MyGridShape['props'] {
		return {}
	}

	getGeometry(): Geometry2d {
		return new Rectangle2d({
			width: COUNTER_SIZE * 5,
			height: COUNTER_SIZE * 2,
			isFilled: true,
		})
	}

	override canResize = () => false
	override hideResizeHandles = () => true

	override canDropShapes = (shape: MyGridShape, shapes: TLShape[]) => {
		if (shapes.every((s) => s.type === 'my-counter-shape')) {
			return true
		}
		return false
	}

	override onDragShapesOver = (shape: MyGridShape, shapes: TLShape[]) => {
		if (!shapes.every((child) => child.parentId === shape.id)) {
			this.editor.reparentShapes(shapes, shape.id)
		}
	}

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
					backgroundSize: `${COUNTER_SIZE}px ${COUNTER_SIZE}px`,
					backgroundImage: `
						linear-gradient(to right, #ccc 1px, transparent 1px),
						linear-gradient(to bottom, #ccc 1px, transparent 1px)
					`,
				}}
			></HTMLContainer>
		)
	}

	indicator() {
		return <rect width={COUNTER_SIZE * 5} height={COUNTER_SIZE * 2} />
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

*/
