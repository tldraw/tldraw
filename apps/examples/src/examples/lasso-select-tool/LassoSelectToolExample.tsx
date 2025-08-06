import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultToolbar,
	DefaultToolbarContent,
	pointInPolygon,
	StateNode,
	TLComponents,
	Tldraw,
	TldrawUiMenuItem,
	TLPointerEventInfo,
	TLShape,
	TLUiOverrides,
	useIsToolSelected,
	useTools,
	Vec,
	VecModel,
} from 'tldraw'

export default function LassoSelectToolExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				tools={[LassoSelectTool]}
				overrides={uiOverrides}
				components={components}
				// initialState="lasso-select"
				persistenceKey="lass-select-example"
			/>
		</div>
	)
}

const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		// Create a tool item in the ui's context.
		tools['lasso-select'] = {
			id: 'lasso-select',
			icon: 'circle',
			label: 'Lasso Select',
			kbd: 'l',
			onSelect: () => {
				editor.setCurrentTool('lasso-select')
			},
		}
		return tools
	},
}

const components: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isLassoSelected = useIsToolSelected(tools['lasso-select'])
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['lasso-select']} isSelected={isLassoSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
	KeyboardShortcutsDialog: (props) => {
		const tools = useTools()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<DefaultKeyboardShortcutsDialogContent />
				<TldrawUiMenuItem {...tools['lasso-select']} />
			</DefaultKeyboardShortcutsDialog>
		)
	},
}

interface LassoSegment {
	points: VecModel[]
}

export class LassoSelectTool extends StateNode {
	static override id = 'lasso-select'
	static override children() {
		return [IdleState, LassoingState]
	}
	static override initial = 'idle'
}

class IdleState extends StateNode {
	static override id = 'idle'

	override onPointerDown(info: TLPointerEventInfo) {
		const { editor } = this

		editor.selectNone()
		this.parent.transition('lassoing', info)
	}
}

class LassoingState extends StateNode {
	static override id = 'lassoing'

	info = {} as TLPointerEventInfo

	pagePointWhereCurrentSegmentChanged = {} as Vec

	pagePointWhereNextSegmentChanged = null as Vec | null

	lastRecordedPoint = {} as Vec
	mergeNextPoint = false
	currentLineLength = 0

	markId = null as null | string

	segments: LassoSegment[] = [{ points: [] }]

	isClosed = false

	override onEnter(info: TLPointerEventInfo) {
		this.segments = [{ points: [] }]
		this.markId = null
		this.info = info
		this.lastRecordedPoint = this.editor.inputs.currentPagePoint.clone()
		this.startLasso()
	}

	override onPointerUp(_info: TLPointerEventInfo): void {
		this.complete()
	}

	override onPointerMove(_info: TLPointerEventInfo): void {
		this.updateSelection()
	}

	private startLasso() {
		const {
			inputs: { originPagePoint },
		} = this.editor

		this.markId = this.editor.markHistoryStoppingPoint('lasso start')

		this.lastRecordedPoint = originPagePoint.clone()

		this.pagePointWhereCurrentSegmentChanged = originPagePoint.clone()

		this.currentLineLength = 0
	}

	private updateSelection() {
		const { inputs } = this.editor

		const { segments } = this
		const { x, y, z } = inputs.currentPagePoint.toFixed()
		const newPoint = { x, y, z }
		// console.log('newPoint', newPoint)

		const newSegments = segments.slice()
		const newSegment = newSegments[newSegments.length - 1]
		const newPoints = [...newSegment.points]

		if (newPoints.length && this.mergeNextPoint) {
			newPoints[newPoints.length - 1] = {
				x: newPoint.x,
				y: newPoint.y,
				z: newPoint.z,
			}
		} else {
			// console.log('adding new point', newPoints[newPoints.length - 1], newPoint)
			this.currentLineLength += Vec.Dist(newPoints[newPoints.length - 1] ?? newPoint, newPoint)
			newPoints.push(newPoint)
		}

		newSegments[newSegments.length - 1] = {
			...newSegment,
			points: newPoints,
		}

		if (this.currentLineLength < 32) {
			this.currentLineLength = this.getLineLength(segments)
		}

		this.isClosed = this.getIsClosed(newSegments)
		this.segments = newSegments
	}

	private getShapesInLasso() {
		const { editor } = this
		const shapes = editor.getCurrentPageRenderingShapesSorted()

		const { segments } = this

		const lasso = new LassoSelection2d(segments.flatMap((segment) => segment.points))

		const shapesInLasso = shapes.filter((shape) => {
			return this.doesLassoFullyContainShape(lasso, shape)
		})

		return shapesInLasso
	}

	private doesLassoFullyContainShape(lasso: LassoSelection2d, shape: TLShape): boolean {
		const { editor } = this

		// Get the shape's geometry
		const geometry = editor.getShapeGeometry(shape)

		// Get the shape's page transform to convert vertices to page space
		const pageTransform = editor.getShapePageTransform(shape)

		// Get the shape's vertices in page space
		const shapeVertices = pageTransform.applyToPoints(geometry.vertices)

		// Check if all vertices of the shape are inside the lasso polygon
		return shapeVertices.every((vertex) => {
			return pointInPolygon(vertex, lasso.points)
		})
	}

	private getIsClosed(segments: LassoSegment[]) {
		const firstPoint = segments[0].points[0]
		const lastSegment = segments[segments.length - 1]
		const lastPoint = lastSegment.points[lastSegment.points.length - 1]

		return (
			firstPoint !== lastPoint &&
			this.currentLineLength > 32 &&
			Vec.DistMin(firstPoint, lastPoint, 16)
		)
	}

	private getLineLength(segments: LassoSegment[]) {
		let length = 0

		for (const segment of segments) {
			for (let i = 0; i < segment.points.length - 1; i++) {
				const A = segment.points[i]
				const B = segment.points[i + 1]
				length += Vec.Dist2(B, A)
			}
		}

		return Math.sqrt(length)
	}

	override onComplete() {
		this.complete()
	}

	complete() {
		const shapesInLasso = this.getShapesInLasso()

		this.editor.setSelectedShapes(shapesInLasso)

		// this.parent.transition('idle', this.info)
		this.editor.setCurrentTool('select')
	}
}

class LassoSelection2d {
	points: VecModel[]
	constructor(points: VecModel[]) {
		this.points = points
	}
}
