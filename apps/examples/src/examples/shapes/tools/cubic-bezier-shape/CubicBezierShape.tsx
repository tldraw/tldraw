import {
	BoundsSnapGeometry,
	CubicBezier2d,
	Geometry2d,
	getIndicesAbove,
	HandleSnapGeometry,
	HTMLContainer,
	RecordProps,
	ShapeUtil,
	TLHandle,
	TLHandleDragInfo,
	TLResizeInfo,
	TLShape,
	Vec,
	VecLike,
	vecModelValidator,
	ZERO_INDEX_KEY,
} from 'tldraw'

const BEZIER_CURVE_TYPE = 'bezier-curve'

// [1]
declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[BEZIER_CURVE_TYPE]: { start: VecLike; cp1: VecLike; cp2: VecLike; end: VecLike }
	}
}

// [2]
export type MyBezierCurveShape = TLShape<typeof BEZIER_CURVE_TYPE>

// [3]
export class BezierCurveShapeUtil extends ShapeUtil<MyBezierCurveShape> {
	static override type = BEZIER_CURVE_TYPE
	static override props: RecordProps<MyBezierCurveShape> = {
		start: vecModelValidator,
		cp1: vecModelValidator,
		cp2: vecModelValidator,
		end: vecModelValidator,
	}

	private isCtrlKeyOnTranslateStart = false
	private didHitCurveOnTranslateStart = false

	override getDefaultProps(): MyBezierCurveShape['props'] {
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

	// [4]
	getGeometry(shape: MyBezierCurveShape): Geometry2d {
		return new CubicBezier2d({
			start: new Vec(shape.props.start.x, shape.props.start.y),
			cp1: new Vec(shape.props.cp1.x, shape.props.cp1.y),
			cp2: new Vec(shape.props.cp2.x, shape.props.cp2.y),
			end: new Vec(shape.props.end.x, shape.props.end.y),
		})
	}

	override hideSelectionBoundsBg(shape: MyBezierCurveShape): boolean {
		return this.editor.getEditingShapeId() === shape.id
	}

	override hideSelectionBoundsFg(shape: MyBezierCurveShape): boolean {
		return this.editor.getEditingShapeId() === shape.id
	}

	override hideResizeHandles(shape: MyBezierCurveShape): boolean {
		return this.editor.getEditingShapeId() === shape.id
	}

	override onResize(shape: MyBezierCurveShape, info: TLResizeInfo<MyBezierCurveShape>) {
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

	override getBoundsSnapGeometry(shape: MyBezierCurveShape): BoundsSnapGeometry {
		return {
			points: [shape.props.start, shape.props.end],
		}
	}

	override toSvg(shape: MyBezierCurveShape) {
		const path = this.getGeometry(shape).getSvgPathData(true)
		return <path d={path} stroke="black" fill="transparent" strokeWidth={2} />
	}

	// [5]
	override getHandles(shape: MyBezierCurveShape): TLHandle[] {
		const indices = [ZERO_INDEX_KEY, ...getIndicesAbove(ZERO_INDEX_KEY, 3)]

		let handles: TLHandle[] = [
			{
				id: 'start',
				type: 'vertex',
				x: shape.props.start.x,
				y: shape.props.start.y,
				index: indices[0],
				snapType: 'align',
			},
			{
				id: 'cp1',
				type: 'vertex',
				x: shape.props.cp1.x,
				y: shape.props.cp1.y,
				index: indices[1],
				snapType: 'align',
				snapReferenceHandleId: 'start',
			},
			{
				id: 'cp2',
				type: 'vertex',
				x: shape.props.cp2.x,
				y: shape.props.cp2.y,
				index: indices[2],
				snapType: 'align',
			},
			{
				id: 'end',
				type: 'vertex',
				x: shape.props.end.x,
				y: shape.props.end.y,
				index: indices[3],
				snapType: 'align',
			},
		]

		if (Vec.Equals(shape.props.cp1, shape.props.start)) {
			handles = handles.filter((handle) => handle.id !== 'cp1')
		}

		if (Vec.Equals(shape.props.cp2, shape.props.end)) {
			handles = handles.filter((handle) => handle.id !== 'cp2')
		}

		return handles
	}

	// [6]
	override getHandleSnapGeometry(shape: MyBezierCurveShape): HandleSnapGeometry {
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

	// [7]
	override onHandleDrag(shape: MyBezierCurveShape, info: TLHandleDragInfo<MyBezierCurveShape>) {
		const { handle } = info
		const { id, x, y } = handle

		let newProps: Partial<MyBezierCurveShape['props']> = {}

		// cmd/ctrl + drag on start or end moves that endpoint's control point instead
		if (this.editor.inputs.getCtrlKey()) {
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
				const delta = Vec.Sub(handle, shape.props.start)

				newProps = {
					start: { x, y },
					cp1: { x: shape.props.cp1.x + delta.x, y: shape.props.cp1.y + delta.y },
				}
				break
			}
			case 'end': {
				const delta = Vec.Sub(handle, shape.props.end)

				newProps = {
					end: { x, y },
					cp2: { x: shape.props.cp2.x + delta.x, y: shape.props.cp2.y + delta.y },
				}
				break
			}
			default: {
				newProps = {
					[id as 'cp1' | 'cp2']: { x, y },
				}
				break
			}
		}

		return {
			...shape,
			props: {
				...shape.props,
				...newProps,
			},
		}
	}

	// [8]
	override onTranslateStart(shape: MyBezierCurveShape) {
		// sample the meta key once here so the curve doesn't start bending if the user presses
		// cmd/ctrl partway through a plain translation
		this.isCtrlKeyOnTranslateStart = this.editor.inputs.getCtrlKey()

		// bend only when the drag started on the curve itself, not on the start or end handle
		const handles = this.getHandles(shape)
		const startAndEndHandles = handles.filter(
			(handle) => handle.id === 'start' || handle.id === 'end'
		)
		if (!startAndEndHandles.length) return

		const hitStartOrEndHandle = startAndEndHandles.some((handle) => {
			const threshold = 8 / this.editor.getZoomLevel()
			const pageTransform = this.editor.getShapePageTransform(shape)
			const handleInPageSpace = pageTransform.applyToPoint(handle)

			if (Vec.Dist(handleInPageSpace, this.editor.inputs.getCurrentPagePoint()) < threshold) {
				return true
			}
			return false
		})

		const hitCurve = this.editor.isPointInShape(shape, this.editor.inputs.getCurrentPagePoint(), {
			margin: 10 / this.editor.getZoomLevel(),
		})

		this.didHitCurveOnTranslateStart = hitCurve && !hitStartOrEndHandle
	}

	override onTranslate(initial: MyBezierCurveShape, current: MyBezierCurveShape) {
		if (this.isCtrlKeyOnTranslateStart && this.didHitCurveOnTranslateStart) {
			const delta = Vec.Sub(current, initial)
			const offsetX = Math.round(delta.x)
			const offsetY = Math.round(delta.y)

			return {
				...initial,
				props: {
					...initial.props,
					cp1: { x: initial.props.cp1.x + offsetX, y: initial.props.cp1.y + offsetY },
					cp2: { x: initial.props.cp2.x + offsetX, y: initial.props.cp2.y + offsetY },
				},
			}
		}

		return
	}

	// [9]
	component(shape: MyBezierCurveShape) {
		const path = this.getGeometry(shape).getSvgPathData(true)
		const { start, end, cp1, cp2 } = shape.props

		const zoomLevel = this.editor.getZoomLevel()

		return (
			<HTMLContainer>
				<svg className="tl-svg-container">
					<path d={path} stroke="black" fill="transparent" />
					<>
						{this.shouldShowControlLines(shape) && (
							<>
								<line
									x1={start.x}
									y1={start.y}
									x2={cp1.x}
									y2={cp1.y}
									stroke="black"
									strokeWidth={1 / zoomLevel}
									strokeDasharray={`${6 / zoomLevel} ${6 / zoomLevel}`}
									opacity={0.5}
								/>
								<line
									x1={end.x}
									y1={end.y}
									x2={cp2.x}
									y2={cp2.y}
									stroke="black"
									strokeWidth={1 / zoomLevel}
									strokeDasharray={`${6 / zoomLevel} ${6 / zoomLevel}`}
									opacity={0.5}
								/>
							</>
						)}
					</>
				</svg>
			</HTMLContainer>
		)
	}

	getIndicatorPath(shape: MyBezierCurveShape) {
		const path = this.getGeometry(shape).getSvgPathData(true)
		return new Path2D(path)
	}

	private shouldShowControlLines(shape: MyBezierCurveShape) {
		const selectedShape = this.editor.getOnlySelectedShape() === shape
		if (!selectedShape) return false

		return this.editor.isInAny(
			'select.editing_shape',
			'select.pointing_handle',
			'select.dragging_handle'
		)
	}
}

/*
This is our custom cubic bezier curve shape. A cubic bezier curve is defined by four points: start,
end, and two control points (cp1, cp2).

[1]
Extend TLGlobalShapePropsMap to add our shape's props to the global type system: the four points
that define the curve.

[2]
Define the shape type using TLShape with the shape's type as a type argument.

[3]
BezierCurveShapeUtil extends ShapeUtil directly (rather than BaseBoxShapeUtil) because the shape has
no width and height props; its bounds come from the curve. `vecModelValidator` validates each point.

[4]
getGeometry returns a CubicBezier2d, which the editor uses for hit-testing, bounds, and snapping.
Because it isn't filled, clicking inside the curve's bounds but away from the line doesn't hit it.

[5]
Four handles: start, end, cp1, and cp2. A control point handle is hidden when it sits exactly on
its endpoint (a "collapsed" corner). `snapType: 'align'` lets a handle snap into alignment with the
snap points returned from [6].

[6]
getHandleSnapGeometry controls what handles snap to. `points` are what other shapes' handles snap
to; `getSelfSnapPoints` returns what this shape's own handles snap to. Control points snap to the
endpoints so you can collapse them by dragging, and endpoints snap to each other. The snap manager
handles zoom-independent thresholds and draws the snap indicators.

[7]
onHandleDrag returns the updated shape:
- Cmd/ctrl + drag on start/end moves that endpoint's control point (cp1 or cp2) instead.
- Dragging start/end also carries its control point along, so the curve keeps its shape.
- Dragging cp1/cp2 moves only that control point.

[8]
onTranslateStart and onTranslate implement "bending": cmd/ctrl + drag on the curve itself moves both
control points together instead of moving the shape. Whether to bend is decided once in
onTranslateStart, based on where the drag started and whether cmd/ctrl was down.

[9]
The component draws the curve, plus dashed lines from start→cp1 and end→cp2 while the shape is
being edited or a handle is being dragged. Stroke widths are divided by the zoom level so they stay
one screen pixel wide.
*/
