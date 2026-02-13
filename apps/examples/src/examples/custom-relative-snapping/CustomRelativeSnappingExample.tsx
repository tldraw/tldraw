import {
	Edge2d,
	Geometry2d,
	Group2d,
	HTMLContainer,
	RecordProps,
	ShapeUtil,
	TLHandle,
	TLHandleDragInfo,
	TLShape,
	Tldraw,
	Vec,
	VecLike,
	ZERO_INDEX_KEY,
	getIndicesAbove,
	vecModelValidator,
} from 'tldraw'
import 'tldraw/tldraw.css'

const Y_SHAPE_TYPE = 'y-shape'

// [1]
declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[Y_SHAPE_TYPE]: {
			center: VecLike
			armTop: VecLike
			armLeft: VecLike
			armRight: VecLike
		}
	}
}

// [2]
type YShape = TLShape<typeof Y_SHAPE_TYPE>

// [3]
class YShapeUtil extends ShapeUtil<YShape> {
	static override type = Y_SHAPE_TYPE
	static override props: RecordProps<YShape> = {
		center: vecModelValidator,
		armTop: vecModelValidator,
		armLeft: vecModelValidator,
		armRight: vecModelValidator,
	}

	override getDefaultProps(): YShape['props'] {
		return {
			center: { x: 100, y: 100 },
			armTop: { x: 100, y: 180 },
			armLeft: { x: 30, y: 20 },
			armRight: { x: 170, y: 20 },
		}
	}

	override canEdit(): boolean {
		return true
	}

	override hideSelectionBoundsBg(): boolean {
		return true
	}

	override hideSelectionBoundsFg(): boolean {
		return true
	}

	override hideResizeHandles(): boolean {
		return true
	}

	override hideRotateHandle(): boolean {
		return true
	}

	// [4]
	getGeometry(shape: YShape): Geometry2d {
		const { center, armTop, armLeft, armRight } = shape.props
		const c = Vec.From(center)
		const t = Vec.From(armTop)
		const l = Vec.From(armLeft)
		const r = Vec.From(armRight)

		return new Group2d({
			children: [
				new Edge2d({ start: c, end: t }),
				new Edge2d({ start: c, end: l }),
				new Edge2d({ start: c, end: r }),
			],
		})
	}

	// [5]
	override getHandles(shape: YShape): TLHandle[] {
		const indices = [ZERO_INDEX_KEY, ...getIndicesAbove(ZERO_INDEX_KEY, 3)]

		return [
			{
				id: 'center',
				type: 'vertex',
				x: shape.props.center.x,
				y: shape.props.center.y,
				index: indices[0],
			},
			{
				id: 'armTop',
				type: 'vertex',
				x: shape.props.armTop.x,
				y: shape.props.armTop.y,
				index: indices[1],
				// [6]
				snapReferenceHandleId: 'center',
			},
			{
				id: 'armLeft',
				type: 'vertex',
				x: shape.props.armLeft.x,
				y: shape.props.armLeft.y,
				index: indices[2],
				// [7]
				snapReferenceHandleId: 'center',
			},
			{
				id: 'armRight',
				type: 'vertex',
				x: shape.props.armRight.x,
				y: shape.props.armRight.y,
				index: indices[3],
				// [8]
				snapReferenceHandleId: 'center',
			},
		]
	}

	override onHandleDrag(shape: YShape, info: TLHandleDragInfo<YShape>) {
		const { handle } = info
		return {
			...shape,
			props: {
				...shape.props,
				[handle.id]: { x: handle.x, y: handle.y },
			},
		}
	}

	// [9]
	component(shape: YShape) {
		const { center, armTop, armLeft, armRight } = shape.props

		return (
			<HTMLContainer>
				<svg className="tl-svg-container">
					<line
						x1={center.x}
						y1={center.y}
						x2={armTop.x}
						y2={armTop.y}
						stroke="black"
						strokeWidth={2}
					/>
					<line
						x1={center.x}
						y1={center.y}
						x2={armLeft.x}
						y2={armLeft.y}
						stroke="black"
						strokeWidth={2}
					/>
					<line
						x1={center.x}
						y1={center.y}
						x2={armRight.x}
						y2={armRight.y}
						stroke="black"
						strokeWidth={2}
					/>
				</svg>
			</HTMLContainer>
		)
	}

	indicator(shape: YShape) {
		const { center, armTop, armLeft, armRight } = shape.props
		return (
			<>
				<line x1={center.x} y1={center.y} x2={armTop.x} y2={armTop.y} />
				<line x1={center.x} y1={center.y} x2={armLeft.x} y2={armLeft.y} />
				<line x1={center.x} y1={center.y} x2={armRight.x} y2={armRight.y} />
			</>
		)
	}
}

const customShapes = [YShapeUtil]

export default function CustomRelativeSnappingYShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShapes}
				onMount={(editor) => {
					const viewportPageBounds = editor.getViewportPageBounds()
					const centerX = viewportPageBounds.center.x
					const centerY = viewportPageBounds.center.y

					editor.createShape({
						type: Y_SHAPE_TYPE,
						x: centerX - 100,
						y: centerY - 100,
					})

					const shapeId = editor.getCurrentPageShapeIds().values().next().value
					if (shapeId) {
						editor.select(shapeId)
					}
				}}
			/>
		</div>
	)
}

/*
This example demonstrates the `snapReferenceHandleId` property using a Y-shaped connector.

The shape has three arms radiating from a center junction point:
- center (junction point)
- armTop (top arm endpoint)
- armLeft (bottom-left arm endpoint)
- armRight (bottom-right arm endpoint)

[1]
First, we need to extend TLGlobalShapePropsMap to add our shape's props to the global type system.
This tells TypeScript about the shape type with four points representing a Y-shaped connector.

[2]
Define the shape type using TLShape with the shape's type as a type argument.

[3]
The shape util with validators for each point.

[4]
Use Group2d geometry containing three line segments from center to each arm.

[5]
Four handles in array order: [center, armTop, armLeft, armRight]

[6]
With `snapReferenceHandleId: 'center'`, when you shift+drag armTop, it will snap to the center point.

[7]
Similarly, armLeft would snap relative to the center point.

[8]
And armRight would snap to the center point.

[9]
The component method defines how our shape renders.

*/
