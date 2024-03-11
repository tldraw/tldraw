import {
	BoundsSnapPoint,
	Box,
	Editor,
	Mat,
	MatModel,
	PageRecordType,
	Session,
	TLShape,
	TLShapePartial,
	Vec,
	compact,
	isPageId,
	moveCameraWhenCloseToEdge,
} from '@tldraw/editor'
import { DragAndDropManager } from '../tools/SelectTool/DragAndDropManager'

export class TranslatingSession extends Session<{
	isCreating: boolean
}> {
	readonly id = 'translating'

	didTranslate = false

	markId = ''

	isCloning = false

	selectionSnapshot: TranslatingSnapshot = {} as any

	snapshot: TranslatingSnapshot = {} as any

	dragAndDropManager = new DragAndDropManager(this.editor)

	onStart() {
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

	onUpdate() {
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

		this.dragAndDropManager.updateDroppingNode(snapshot.movingShapes, this.updateParentTransforms)

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

		return
	}

	onInterrupt() {
		return
	}

	onComplete() {
		const { movingShapes } = this.snapshot

		this.dragAndDropManager.dropShapes(movingShapes)

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

		return
	}

	onCancel() {
		return
	}

	onEnd() {
		return
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
