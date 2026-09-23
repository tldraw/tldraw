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
	createShapeId,
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
				snapReferenceHandleId: 'center',
			},
			{
				id: 'armRight',
				type: 'vertex',
				x: shape.props.armRight.x,
				y: shape.props.armRight.y,
				index: indices[3],
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

	// [7]
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

	getIndicatorPath(shape: YShape) {
		const { center, armTop, armLeft, armRight } = shape.props
		const path = new Path2D()
		path.moveTo(center.x, center.y)
		path.lineTo(armTop.x, armTop.y)
		path.moveTo(center.x, center.y)
		path.lineTo(armLeft.x, armLeft.y)
		path.moveTo(center.x, center.y)
		path.lineTo(armRight.x, armRight.y)
		return path
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

					const id = createShapeId()
					editor.createShape({
						id,
						type: Y_SHAPE_TYPE,
						x: centerX - 100,
						y: centerY - 100,
					})
					editor.select(id)
				}}
			/>
		</div>
	)
}

/*
The shape is a Y-shaped connector: three arms radiating from a center junction point.

When you hold shift while dragging a handle, the editor snaps the handle's angle to 15 degree
increments, measured from a reference handle. By default the reference is the next vertex handle
in index order, which for a shape like this would be a neighbouring arm rather than the junction.
`snapReferenceHandleId` lets each arm name the center as its reference instead.

[1]
Extend TLGlobalShapePropsMap to add our shape's props to the global type system: four points
representing the junction and the three arm endpoints.

[2]
Define the shape type using TLShape with the shape's type as a type argument.

[3]
The shape util, with `vecModelValidator` for each point. Selection bounds, resize handles, and
the rotate handle are hidden because the handles are the whole interface for this shape.

[4]
The geometry is a Group2d containing three Edge2d segments from the center to each arm, so
hit-testing follows the lines rather than the bounding box.

[5]
Four handles in index order: [center, armTop, armLeft, armRight]. `getIndicesAbove` generates
fractional index keys after ZERO_INDEX_KEY so the handles have a well-defined order.

[6]
Each arm sets `snapReferenceHandleId: 'center'`. Shift + drag any arm and its angle snaps
relative to the junction. Try removing the property from one arm and shift-dragging it: the
angle then snaps relative to whichever vertex handle comes next in index order.

[7]
The component draws the three arms as SVG lines.
*/
