import {
	BoundsSnapGeometry,
	CubicBezier2d,
	Geometry2d,
	getIndicesAbove,
	HandleSnapGeometry,
	HTMLContainer,
	RecordProps,
	ShapeUtil,
	TLBaseShape,
	TLHandle,
	TLHandleDragInfo,
	TLResizeInfo,
	Vec,
	VecLike,
	vecModelValidator,
	ZERO_INDEX_KEY,
} from 'tldraw'

// [1]
export type MyBezierCurveShape = TLBaseShape<
	'bezier-curve',
	{
		start: VecLike
		cp1: VecLike
		cp2: VecLike
		end: VecLike
	}
>

// [2]
export class BezierCurveShapeUtil extends ShapeUtil<MyBezierCurveShape> {
	static override type = 'bezier-curve' as const
	static override props: RecordProps<MyBezierCurveShape> = {
		start: vecModelValidator,
		cp1: vecModelValidator,
		cp2: vecModelValidator,
		end: vecModelValidator,
	}

	private isMetaKeyOnTranslateStart = false
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

	// [3]
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

	// [4]
	override getHandles(shape: MyBezierCurveShape): TLHandle[] {
		const CONTROL_POINT_THRESHOLD = 2

		const pageTransform = this.editor.getShapePageTransform(shape)

		const cp1InPageSpace = pageTransform.applyToPoint(shape.props.cp1)
		const cp2InPageSpace = pageTransform.applyToPoint(shape.props.cp2)
		const startInPageSpace = pageTransform.applyToPoint(shape.props.start)
		const endInPageSpace = pageTransform.applyToPoint(shape.props.end)

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

		// collapse control points if you drag them to the its associated start or end point
		if (Vec.Dist(cp1InPageSpace, startInPageSpace) < CONTROL_POINT_THRESHOLD) {
			handles = handles.filter((handle) => handle.id !== 'cp1')
		}

		if (Vec.Dist(cp2InPageSpace, endInPageSpace) < CONTROL_POINT_THRESHOLD) {
			handles = handles.filter((handle) => handle.id !== 'cp2')
		}

		return handles
	}

	// [5]
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

	// [6]
	override onHandleDrag(shape: MyBezierCurveShape, info: TLHandleDragInfo<MyBezierCurveShape>) {
		const { handle } = info
		const { id, x, y } = handle

		let props = {}
		let newProps: any = {}

		// if you hold command or control key whilst dragging over a start or end handle,
		// move the associated control point to the new positions
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

		// move the handles
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

	override onTranslateStart(shape: MyBezierCurveShape) {
		// only bend if we start translating with the command or control key pressed
		// this avoids bending the curve midway through a translation where the user accidentally
		// holds the command or control key
		this.isMetaKeyOnTranslateStart = this.editor.inputs.metaKey

		// we should bend the curve if we hit the curve but not the start or end handles,
		const handles = this.getHandles(shape)
		const startAndEndHandles = handles.filter(
			(handle) => handle.id === 'start' || handle.id === 'end'
		)
		if (!startAndEndHandles.length) return

		const hitStartOrEndHandle = startAndEndHandles.some((handle) => {
			const threshold = 8 / this.editor.getZoomLevel()
			const pageTransform = this.editor.getShapePageTransform(shape)
			const handleInPageSpace = pageTransform.applyToPoint(handle)

			if (Vec.Dist(handleInPageSpace, this.editor.inputs.currentPagePoint) < threshold) {
				return true
			}
			return false
		})

		const hitCurve = this.editor.isPointInShape(shape, this.editor.inputs.currentPagePoint, {
			margin: 10 / this.editor.getZoomLevel(),
		})

		this.didHitCurveOnTranslateStart = hitCurve && !hitStartOrEndHandle
	}

	override onTranslate(initial: MyBezierCurveShape, current: MyBezierCurveShape) {
		// bend the curve
		if (this.isMetaKeyOnTranslateStart && this.didHitCurveOnTranslateStart) {
			const delta = Vec.Sub(current, initial)

			return {
				...initial,
				props: {
					...initial.props,
					cp1: { x: initial.props.cp1.x + delta.x, y: initial.props.cp1.y + delta.y },
					cp2: { x: initial.props.cp2.x + delta.x, y: initial.props.cp2.y + delta.y },
				},
			}
		}

		return
	}

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
									strokeDasharray="6 6"
									opacity={0.5}
								/>
								<line
									x1={end.x}
									y1={end.y}
									x2={cp2.x}
									y2={cp2.y}
									stroke="black"
									strokeWidth={1 / zoomLevel}
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

	indicator(shape: MyBezierCurveShape) {
		const path = this.getGeometry(shape).getSvgPathData(true)
		return <path d={path} />
	}

	private shouldShowControlLines(shape: MyBezierCurveShape) {
		const selectedShape = this.editor.getOnlySelectedShape() === shape
		if (!selectedShape) return false

		return this.editor.isInAny(
			'select.translating',
			'select.editing_shape',
			'select.pointing_handle',
			'select.dragging_handle'
		)
	}
}

/*
This is our custom cubic bezier curve shape. A cubic bezier curve is defined by four points: start, end, and two control points (cp1, cp2).

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
1. Pressing meta key while clicking the start handle moves cp1 to coincide with the start point.
2. Pressing meta key while clicking the end handle moves cp2 to coincide with the end point.
3. Control point handles that are very close to their endpoints (< 2 units) are automatically hidden.
4. Moving a start or end handle will move the associated control point with it.

This ensures a better editing experience by maintaining the relative position of the 
control points to the endpoints for smoother curves.
*/
