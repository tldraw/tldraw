import {
	BoundsSnapGeometry,
	CubicBezier2d,
	Geometry2d,
	HandleSnapGeometry,
	HTMLContainer,
	IndexKey,
	RecordProps,
	ShapeUtil,
	StateNode,
	TLBaseShape,
	Tldraw,
	TLHandle,
	TLHandleDragInfo,
	TLPointerEventInfo,
	TLResizeInfo,
	Vec,
	VecLike,
	vecModelValidator,
	ZERO_INDEX_KEY,
} from 'tldraw'
import { ControlHandles } from './ControlHandles'
import { Pen } from './PenTool/Pen'

// [1]
type IBezierCurveShape = TLBaseShape<
	'bezier-curve',
	{
		start: VecLike
		cp1: VecLike
		cp2: VecLike
		end: VecLike
	}
>

// [2]
export class BezierCurveShapeUtil extends ShapeUtil<IBezierCurveShape> {
	static override type = 'bezier-curve' as const
	static override props: RecordProps<IBezierCurveShape> = {
		start: vecModelValidator,
		cp1: vecModelValidator,
		cp2: vecModelValidator,
		end: vecModelValidator,
	}

	override getDefaultProps(): IBezierCurveShape['props'] {
		return {
			start: { x: 0, y: 0 },
			cp1: { x: 0, y: 140 },
			cp2: { x: 350, y: 300 },
			end: { x: 400, y: 110 },
		}
	}

	override canEdit(): boolean {
		return true
	}

	// [3]
	getGeometry(shape: IBezierCurveShape): Geometry2d {
		return new CubicBezier2d({
			start: new Vec(shape.props.start.x, shape.props.start.y),
			cp1: new Vec(shape.props.cp1.x, shape.props.cp1.y),
			cp2: new Vec(shape.props.cp2.x, shape.props.cp2.y),
			end: new Vec(shape.props.end.x, shape.props.end.y),
		})
	}

	override hideSelectionBoundsBg(shape: IBezierCurveShape): boolean {
		return this.editor.getEditingShapeId() === shape.id
	}

	override hideSelectionBoundsFg(shape: IBezierCurveShape): boolean {
		return this.editor.getEditingShapeId() === shape.id
	}

	override hideResizeHandles(shape: IBezierCurveShape): boolean {
		return this.editor.getEditingShapeId() === shape.id
	}

	override onResize(shape: IBezierCurveShape, info: TLResizeInfo<IBezierCurveShape>) {
		const { scaleX, scaleY } = info
		return {
			props: {
				start: { x: shape.props.start.x * scaleX, y: shape.props.start.y * scaleY },
				cp1: { x: shape.props.cp1.x * scaleX, y: shape.props.cp1.y * scaleY },
				cp2: { x: shape.props.cp2.x * scaleX, y: shape.props.cp2.y * scaleY },
				end: { x: shape.props.end.x * scaleX, y: shape.props.end.y * scaleY },
			},
		}
	}

	override getBoundsSnapGeometry(shape: IBezierCurveShape): BoundsSnapGeometry {
		return {
			points: [shape.props.start, shape.props.end],
		}
	}

	// [4]
	override getHandles(shape: IBezierCurveShape): TLHandle[] {
		const threshold = 2

		let handles: TLHandle[] = [
			{
				id: 'start',
				type: 'vertex',
				x: shape.props.start.x,
				y: shape.props.start.y,
				index: ZERO_INDEX_KEY,
				snapType: 'align',
			},
			{
				id: 'cp1',
				type: 'vertex',
				x: shape.props.cp1.x,
				y: shape.props.cp1.y,
				index: 'a1' as IndexKey,
				snapType: 'align',
			},
			{
				id: 'cp2',
				type: 'vertex',
				x: shape.props.cp2.x,
				y: shape.props.cp2.y,
				index: 'a2' as IndexKey,
				snapType: 'align',
			},
			{
				id: 'end',
				type: 'vertex',
				x: shape.props.end.x,
				y: shape.props.end.y,
				index: 'a3' as IndexKey,
				snapType: 'align',
			},
		]

		if (Vec.Dist(shape.props.cp1, shape.props.start) < threshold) {
			handles = handles.filter((handle) => handle.id !== 'cp1')
		}

		if (Vec.Dist(shape.props.cp2, shape.props.end) < threshold) {
			handles = handles.filter((handle) => handle.id !== 'cp2')
		}

		return handles
	}

	// [5]
	override getHandleSnapGeometry(shape: IBezierCurveShape): HandleSnapGeometry {
		return {
			points: [shape.props.start, shape.props.end],
			getSelfSnapPoints: (handle) => {
				if (handle.id === 'cp1' || handle.id === 'cp2') {
					return [shape.props.start, shape.props.end]
				}

				return handle.id === 'end' ? [shape.props.start] : [shape.props.end]
			},
		}
	}

	// [6]
	override onHandleDrag(shape: IBezierCurveShape, info: TLHandleDragInfo<IBezierCurveShape>) {
		const { handle } = info
		const { id, x, y } = handle

		let props = {}
		let newProps: any = {}

		if (this.editor.inputs.metaKey) {
			switch (id) {
				case 'start': {
					return {
						...shape,
						props: {
							...shape.props,
							cp1: { x, y },
						},
					}
				}
				case 'end': {
					return {
						...shape,
						props: {
							...shape.props,
							cp2: { x, y },
						},
					}
				}
			}
		}

		switch (id) {
			case 'start': {
				const dx = x - shape.props.start.x
				const dy = y - shape.props.start.y

				newProps = {
					start: { x, y },
					cp1: { x: shape.props.cp1.x + dx, y: shape.props.cp1.y + dy },
				}
				break
			}
			case 'end': {
				const dx = x - shape.props.end.x
				const dy = y - shape.props.end.y

				newProps = {
					end: { x, y },
					cp2: { x: shape.props.cp2.x + dx, y: shape.props.cp2.y + dy },
				}
				break
			}
			default: {
				newProps = {
					[id]: { x, y },
				}
				break
			}
		}

		props = {
			...shape.props,
			...newProps,
		}

		return {
			...shape,
			props,
		}
	}

	component(shape: IBezierCurveShape) {
		const path = this.getGeometry(shape).getSvgPathData(true)
		const { start, end, cp1, cp2 } = shape.props
		const isDraggingHandle = this.editor.isInAny('select.pointing_handle', 'select.dragging_handle')
		const isEditing = this.editor.getEditingShapeId() === shape.id

		const shouldShowControlLines = isEditing || isDraggingHandle

		return (
			<HTMLContainer>
				<svg className="tl-svg-container">
					<path d={path} stroke="black" fill="transparent" />
					<>
						{shouldShowControlLines && (
							<>
								<line
									x1={start.x}
									y1={start.y}
									x2={cp1.x}
									y2={cp1.y}
									stroke="black"
									strokeWidth={1 / this.editor.getZoomLevel()}
									strokeDasharray="6 6"
									opacity={0.5}
								/>
								<line
									x1={end.x}
									y1={end.y}
									x2={cp2.x}
									y2={cp2.y}
									stroke="black"
									strokeWidth={1 / this.editor.getZoomLevel()}
									strokeDasharray="6 6"
									opacity={0.5}
								/>
							</>
						)}
					</>
				</svg>
			</HTMLContainer>
		)
	}

	indicator(shape: IBezierCurveShape) {
		const path = this.getGeometry(shape).getSvgPathData(true)
		return <path d={path} />
	}
}

const customTools = [Pen]
const customShapes = [BezierCurveShapeUtil]

export default function BezierCurveShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				tools={customTools}
				// [7]
				components={{
					Handles: ControlHandles,
				}}
				shapeUtils={customShapes}
				onMount={(editor) => {
					const viewportPageBounds = editor.getViewportPageBounds()
					const centerX = viewportPageBounds.center.x
					const centerY = viewportPageBounds.center.y

					editor.createShape({
						type: 'bezier-curve',
						x: centerX - 200,
						y: centerY - 150,
					})

					// [8]
					type PointingHandle = StateNode & {
						onPointerMove(info: TLPointerEventInfo): void
					}

					const pointingHandleState =
						editor.getStateDescendant<PointingHandle>('select.pointing_handle')
					if (!pointingHandleState) throw Error('SelectTool PointingHandle state not found')

					const ogPointerMove = pointingHandleState.onPointerMove.bind(pointingHandleState)

					function onPointerMove(info: TLPointerEventInfo) {
						if (!info.shape) return

						if (info.shape.type === 'bezier-curve') {
							editor.updateInstanceState({ isToolLocked: true })
							editor.setCurrentTool('select.dragging_handle', {
								...info,
								onInteractionEnd: 'pen',
							})
							return
						}
						ogPointerMove(info)
					}

					const ogEnter = pointingHandleState?.onEnter?.bind(pointingHandleState)
					function onEnter(info: TLPointerEventInfo & { target: 'handle' }, from: string) {
						if (!info) return

						if (info.shape.type === 'bezier-curve' && editor.inputs.metaKey) {
							const shape = info.shape as IBezierCurveShape

							switch (info.handle.id) {
								case 'cp1':
									{
										editor.updateShapes([
											{
												...info.shape,
												props: {
													cp1: { x: shape.props.start.x, y: shape.props.start.y },
												},
											},
										])
									}
									break
								case 'cp2':
									{
										editor.updateShapes([
											{
												...info.shape,
												props: {
													cp2: { x: shape.props.end.x, y: shape.props.end.y },
												},
											},
										])
									}
									break
							}

							editor.setEditingShape(info.shape.id)
							return
						}

						if (!ogEnter) return
						ogEnter(info, from)
					}

					pointingHandleState.onPointerMove = onPointerMove
					pointingHandleState.onEnter = onEnter
				}}
			/>
		</div>
	)
}

/*
Introduction:
This example demonstrates how to create a cubic bezier curve shape with interactive handles.
A cubic bezier curve is defined by four points: start, end, and two control points (cp1, cp2).

[1]
Define the shape type with TLBaseShape. The props include the four points that define the curve.

[2]
The BezierCurveShapeUtil extends ShapeUtil to define all behavior for our custom shape. We specify
the static 'type' and 'props' with validators.

[3]
The getGeometry method returns a CubicBezier2d geometry used for hit-testing, bounds calculations,
and rendering.

[4]
Define four interactive handles: start, end, cp1, and cp2. Each has an id, type, position, and index.

[5]
Custom handle snapping: control points can snap to start/end points, useful for creating sharp corners.

[6]
Handles have a few behaviors:
1. Clicking a control point with a meta key will delete that control point.
2. Moving a start or end handle will move the associated control point with it.

This ensures a better editing experience by maintaining the relative position of the 
control points to the endpoints for smoother curves.

[7]
Use custom ControlHandles component to control handle visibility based on editor state.

[8]
Override two original methods of pointing_handle to return to pen tool after dragging, keeping the shape
in editing mode for continuous handle adjustments and to start dragging a control point when clicking 
on a start or end handle with the meta/cmd key.

*/
