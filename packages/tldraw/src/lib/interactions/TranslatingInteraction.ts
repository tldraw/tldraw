import {
	BoundsSnapPoint,
	Box,
	Editor,
	Interaction,
	Mat,
	MatModel,
	PageRecordType,
	TLShape,
	TLShapeId,
	TLShapePartial,
	Vec,
	compact,
	isPageId,
	moveCameraWhenCloseToEdge,
} from '@tldraw/editor'

const LAG_DURATION = 100

export class TranslatingInteraction extends Interaction<{
	isCreating: boolean
}> {
	readonly id = 'translating'

	didTranslate = false

	markId = ''

	isCloning = false

	selectionSnapshot: TranslatingSnapshot = {} as any

	snapshot: TranslatingSnapshot = {} as any

	override onStart() {
		if (this.info.isCreating) {
			this.markId = `creating:${this.editor.getOnlySelectedShape()!.id}`
		} else {
			this.markId = 'translating'
			this.editor.mark(this.markId)
		}

		this.isCloning = false

		this.editor.setCursor({ type: 'move', rotation: 0 })
		this.selectionSnapshot = getTranslatingSnapshot(this.editor)
		this.snapshot = this.selectionSnapshot

		this.handleStart()
	}

	override onUpdate() {
		const { editor } = this

		// If the user has stopped pointing, we're done
		if (!editor.inputs.isPointing) {
			this.complete()
			return
		}

		if (!this.didTranslate) {
			// If the user has stopped dragging, we're done
			if (!editor.inputs.isDragging) {
				this.complete()
				return
			}

			// mark when we start dragging
			editor.mark(this.id)
			this.didTranslate = true
		}

		moveCameraWhenCloseToEdge(editor)

		if (!this.info.isCreating) {
			if (this.editor.inputs.altKey && !this.isCloning) {
				this.isCloning = true
				this.editor.bailToMark(this.markId)
				this.markId = 'translating'
				this.editor.mark(this.markId)
				this.editor.duplicateShapes(Array.from(this.editor.getSelectedShapeIds()))
				this.snapshot = getTranslatingSnapshot(this.editor)
				this.handleStart()
			} else if (!this.editor.inputs.altKey && this.isCloning) {
				this.isCloning = false
				this.snapshot = this.selectionSnapshot
				this.editor.bailToMark(this.markId)
				this.markId = 'translating'
				this.editor.mark(this.markId)
			}
		}

		const { snapshot } = this

		this.updateDroppingTimer(snapshot.movingShapes)
		this.updateDroppingNode(snapshot.movingShapes, this.updateParentTransforms)

		moveShapesToPoint({
			editor: this.editor,
			shapeSnapshots: snapshot.shapeSnapshots,
			averagePagePoint: snapshot.averagePagePoint,
			initialSelectionPageBounds: snapshot.initialPageBounds,
			initialSelectionSnapPoints: snapshot.initialSnapPoints,
		})

		const { movingShapes } = this.snapshot

		const changes: TLShapePartial[] = []

		movingShapes.forEach((shape) => {
			const current = this.editor.getShape(shape.id)!
			const util = this.editor.getShapeUtil(shape)
			const change = util.onTranslate?.(shape, current)
			if (change) {
				changes.push(change)
			}
		})

		if (changes.length > 0) {
			this.editor.updateShapes(changes)
		}
	}

	override onComplete() {
		const { movingShapes } = this.snapshot

		this.dropShapes(movingShapes)

		if (this.isCloning && movingShapes.length > 0) {
			const currentAveragePagePoint = Vec.Average(
				movingShapes.map((s) => this.editor.getShapePageTransform(s.id)!.point())
			)
			const offset = Vec.Sub(currentAveragePagePoint, this.selectionSnapshot.averagePagePoint)
			if (!Vec.IsNaN(offset)) {
				this.editor.updateInstanceState({
					duplicateProps: {
						shapeIds: movingShapes.map((s) => s.id),
						offset: { x: offset.x, y: offset.y },
					},
				})
			}
		}

		const changes: TLShapePartial[] = []

		movingShapes.forEach((shape) => {
			const current = this.editor.getShape(shape.id)!
			const util = this.editor.getShapeUtil(shape)
			const change = util.onTranslateEnd?.(shape, current)
			if (change) {
				changes.push(change)
			}
		})

		if (changes.length > 0) {
			this.editor.updateShapes(changes)
		}
	}

	override onCancel() {
		this.editor.bailToMark(this.markId)
	}

	private handleStart() {
		const { movingShapes } = this.snapshot

		const changes: TLShapePartial[] = []

		movingShapes.forEach((shape) => {
			const util = this.editor.getShapeUtil(shape)
			const change = util.onTranslateStart?.(shape)
			if (change) {
				changes.push(change)
			}
		})

		if (changes.length > 0) {
			this.editor.updateShapes(changes)
		}

		this.editor.setHoveredShape(null)
	}

	private updateParentTransforms = () => {
		const {
			editor,
			snapshot: { shapeSnapshots },
		} = this
		const movingShapes: TLShape[] = []

		shapeSnapshots.forEach((shapeSnapshot) => {
			const shape = editor.getShape(shapeSnapshot.shape.id)
			if (!shape) return null
			movingShapes.push(shape)

			const parentTransform = isPageId(shape.parentId)
				? null
				: Mat.Inverse(editor.getShapePageTransform(shape.parentId)!)

			shapeSnapshot.parentTransform = parentTransform
		})
	}

	// Drag and drop

	prevDroppingShapeId: TLShapeId | null = null

	first = true

	dragTimerEnd: null | number = null
	dragTimerCallback: null | (() => void) = null

	private updateDroppingTimer(movingShapes: TLShape[]) {
		const { dragTimerCallback, dragTimerEnd } = this
		if (dragTimerEnd !== null && Date.now() > dragTimerEnd) {
			if (dragTimerCallback) {
				this.handleDrag(movingShapes, dragTimerCallback)
			}
			this.dragTimerEnd = null
			this.dragTimerCallback = null
		}
	}

	private updateDroppingNode(movingShapes: TLShape[], cb: () => void) {
		if (this.first) {
			this.prevDroppingShapeId =
				this.editor.getDroppingOverShape(this.editor.inputs.originPagePoint, movingShapes)?.id ??
				null
			this.first = false
		}

		if (this.dragTimerEnd === null) {
			this.dragTimerEnd = Date.now() + LAG_DURATION * 10
			this.dragTimerCallback = cb
		} else if (this.editor.inputs.pointerVelocity.len() > 0.5) {
			this.dragTimerEnd = Date.now() + LAG_DURATION
			this.dragTimerCallback = cb
		}
	}

	private handleDrag(movingShapes: TLShape[], cb?: () => void) {
		const point = this.editor.inputs.currentPagePoint
		movingShapes = compact(movingShapes.map((shape) => this.editor.getShape(shape.id)))

		const nextDroppingShapeId = this.editor.getDroppingOverShape(point, movingShapes)?.id ?? null

		// is the next dropping shape id different than the last one?
		if (nextDroppingShapeId === this.prevDroppingShapeId) {
			return
		}

		// the old previous one
		const { prevDroppingShapeId } = this

		const prevDroppingShape = prevDroppingShapeId && this.editor.getShape(prevDroppingShapeId)
		const nextDroppingShape = nextDroppingShapeId && this.editor.getShape(nextDroppingShapeId)

		// Even if we don't have a next dropping shape id (i.e. if we're dropping
		// onto the page) set the prev to the current, to avoid repeat calls to
		// the previous parent's onDragShapesOut

		if (prevDroppingShape) {
			this.editor.getShapeUtil(prevDroppingShape).onDragShapesOut?.(prevDroppingShape, movingShapes)
		}

		if (nextDroppingShape) {
			const res = this.editor
				.getShapeUtil(nextDroppingShape)
				.onDragShapesOver?.(nextDroppingShape, movingShapes)

			if (res && res.shouldHint) {
				this.editor.setHintingShapes([nextDroppingShape.id])
			}
		} else {
			// If we're dropping onto the page, then clear hinting ids
			this.editor.setHintingShapes([])
		}

		cb?.()

		// next -> curr
		this.prevDroppingShapeId = nextDroppingShapeId
	}

	private dropShapes(shapes: TLShape[]) {
		const { prevDroppingShapeId } = this

		this.handleDrag(shapes)

		if (prevDroppingShapeId) {
			const shape = this.editor.getShape(prevDroppingShapeId)
			if (!shape) return
			this.editor.getShapeUtil(shape).onDropShapesOver?.(shape, shapes)
		}
	}
}

/* --------------------- Helpers -------------------- */

function getTranslatingSnapshot(editor: Editor) {
	const movingShapes: TLShape[] = []
	const pagePoints: Vec[] = []

	const shapeSnapshots = compact(
		editor.getSelectedShapeIds().map((id): null | MovingShapeSnapshot => {
			const shape = editor.getShape(id)
			if (!shape) return null
			movingShapes.push(shape)

			const pagePoint = editor.getShapePageTransform(id)!.point()
			if (!pagePoint) return null
			pagePoints.push(pagePoint)

			const parentTransform = PageRecordType.isId(shape.parentId)
				? null
				: Mat.Inverse(editor.getShapePageTransform(shape.parentId)!)

			return {
				shape,
				pagePoint,
				parentTransform,
			}
		})
	)

	let initialSnapPoints: BoundsSnapPoint[] = []
	if (editor.getSelectedShapeIds().length === 1) {
		initialSnapPoints = editor.snaps.shapeBounds.getSnapPoints(editor.getSelectedShapeIds()[0])!
	} else {
		const selectionPageBounds = editor.getSelectionPageBounds()
		if (selectionPageBounds) {
			initialSnapPoints = selectionPageBounds.cornersAndCenter.map((p, i) => ({
				id: 'selection:' + i,
				x: p.x,
				y: p.y,
			}))
		}
	}

	return {
		averagePagePoint: Vec.Average(pagePoints),
		movingShapes,
		shapeSnapshots,
		initialPageBounds: editor.getSelectionPageBounds()!,
		initialSnapPoints,
	}
}

function moveShapesToPoint({
	editor,
	shapeSnapshots: snapshots,
	averagePagePoint,
	initialSelectionPageBounds,
	initialSelectionSnapPoints,
}: {
	editor: Editor
	shapeSnapshots: MovingShapeSnapshot[]
	averagePagePoint: Vec
	initialSelectionPageBounds: Box
	initialSelectionSnapPoints: BoundsSnapPoint[]
}) {
	const { inputs } = editor

	const isGridMode = editor.getInstanceState().isGridMode

	const gridSize = editor.getDocumentSettings().gridSize

	const delta = Vec.Sub(inputs.currentPagePoint, inputs.originPagePoint)

	const flatten: 'x' | 'y' | null = editor.inputs.shiftKey
		? Math.abs(delta.x) < Math.abs(delta.y)
			? 'x'
			: 'y'
		: null

	if (flatten === 'x') {
		delta.x = 0
	} else if (flatten === 'y') {
		delta.y = 0
	}

	// Provisional snapping
	editor.snaps.clearIndicators()

	const shouldSnap =
		(editor.user.getIsSnapMode() ? !inputs.ctrlKey : inputs.ctrlKey) &&
		editor.inputs.pointerVelocity.len() < 0.5 // ...and if the user is not dragging fast

	if (shouldSnap) {
		const { nudge } = editor.snaps.shapeBounds.snapTranslateShapes({
			dragDelta: delta,
			initialSelectionPageBounds,
			lockedAxis: flatten,
			initialSelectionSnapPoints,
		})

		delta.add(nudge)
	}

	const averageSnappedPoint = Vec.Add(averagePagePoint, delta)

	if (isGridMode && !inputs.ctrlKey) {
		averageSnappedPoint.snapToGrid(gridSize)
	}

	const averageSnap = Vec.Sub(averageSnappedPoint, averagePagePoint)

	editor.updateShapes(
		compact(
			snapshots.map(({ shape, pagePoint, parentTransform }): TLShapePartial | null => {
				const newPagePoint = Vec.Add(pagePoint, averageSnap)
				const newLocalPoint = parentTransform
					? Mat.applyToPoint(parentTransform, newPagePoint)
					: newPagePoint

				return {
					id: shape.id,
					type: shape.type,
					x: newLocalPoint.x,
					y: newLocalPoint.y,
				}
			})
		),
		{ squashing: true }
	)
}

type TranslatingSnapshot = ReturnType<typeof getTranslatingSnapshot>

interface MovingShapeSnapshot {
	shape: TLShape
	pagePoint: Vec
	parentTransform: MatModel | null
}
