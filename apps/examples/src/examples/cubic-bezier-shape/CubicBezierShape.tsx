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

		let props = {}
		let newProps: any = {}

		// if you hold command or control key whilst dragging over a start or end handle,
		// move the associated control point to the new positions
		if (this.editor.inputs.getMetaKey()) {
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

	// [8]
	override onTranslateStart(shape: MyBezierCurveShape) {
		// only bend if we start translating with the command or control key pressed
		// this avoids bending the curve midway through a translation where the user accidentally
		// holds the command or control key
		this.isMetaKeyOnTranslateStart = this.editor.inputs.getMetaKey()

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
		// bend the curve
		if (this.isMetaKeyOnTranslateStart && this.didHitCurveOnTranslateStart) {
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

	indicator(shape: MyBezierCurveShape) {
		const path = this.getGeometry(shape).getSvgPathData(true)
		return <path d={path} />
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
This is our custom cubic bezier curve shape. A cubic bezier curve is defined by four points: start, end, and two control points (cp1, cp2).

[1]
First, we need to extend TLGlobalShapePropsMap to add our shape's props to the global type system.
This tells TypeScript about the shape's properties. For this shape, we define four points (start, cp1, cp2, end)
that define the curve.

[2]
Define the shape type using TLShape with the shape's type as a type argument.

[3]
The BezierCurveShapeUtil extends ShapeUtil to define all behavior for our custom shape. We specify
the static 'type' and 'props' with validators.

[4]
The getGeometry method returns a CubicBezier2d geometry used for hit-testing, bounds calculations,
and rendering.

[5]
Define four interactive handles: start, end, cp1, and cp2. Each has an id, type, position, and index.
Control point handles are hidden when they're at the same position as their associated endpoints (collapsed).

[6]
Custom handle snapping via getHandleSnapGeometry: control points (cp1, cp2) can snap to start/end points.
The snap system automatically handles screen-space thresholds (consistent across zoom levels) and visual
snap indicators. When a control point is snapped to an endpoint, it effectively "collapses" the curve at
that end, creating a sharp corner.

[7]
Handle drag behaviors:
- Meta key + drag start/end handles repositions the associated control point (cp1 or cp2)
- Dragging start/end handles moves the associated control point to maintain curve shape
- Dragging cp1/cp2 directly moves only that control point

[8]
Translation with curve bending: Hold meta key while dragging the curve (not handles) to bend it
by moving both control points together. This is detected on translate start to avoid accidental bending.

[9]
Visual feedback: Display dashed lines from start→cp1 and end→cp2 when the shape is selected
and actively being edited or translated.
*/
