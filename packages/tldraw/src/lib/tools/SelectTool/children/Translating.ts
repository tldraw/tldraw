import {
	Box2d,
	Editor,
	Matrix2d,
	Matrix2dModel,
	PageRecordType,
	SnapPoint,
	StateNode,
	TLEventHandlers,
	TLPointerEventInfo,
	TLShape,
	TLShapePartial,
	Vec2d,
	compact,
	isPageId,
} from '@tldraw/editor'
import { DragAndDropManager } from '../DragAndDropManager'

export class Translating extends StateNode {
	static override id = 'translating'

	info = {} as TLPointerEventInfo & {
		target: 'shape'
		isCreating?: boolean
		editAfterComplete?: boolean
		onInteractionEnd?: string
	}

	selectionSnapshot: TranslatingSnapshot = {} as any

	snapshot: TranslatingSnapshot = {} as any

	markId = ''

	isCloning = false
	isCreating = false
	editAfterComplete = false

	dragAndDropManager = new DragAndDropManager(this.editor)

	override onEnter = (
		info: TLPointerEventInfo & {
			target: 'shape'
			isCreating?: boolean
			editAfterComplete?: boolean
			onInteractionEnd?: string
		}
	) => {
		const { isCreating = false, editAfterComplete = false } = info

		this.info = info
		this.parent.currentToolIdMask = info.onInteractionEnd
		this.isCreating = isCreating
		this.editAfterComplete = editAfterComplete

		this.markId = isCreating ? `creating:${this.editor.onlySelectedShape!.id}` : 'translating'
		this.editor.mark(this.markId)
		this.isCloning = false
		this.info = info

		this.editor.setCursor({ type: 'move', rotation: 0 })
		this.selectionSnapshot = getTranslatingSnapshot(this.editor)

		// Don't clone on create; otherwise clone on altKey
		if (!this.isCreating) {
			if (this.editor.inputs.altKey) {
				this.startCloning()
				return
			}
		}

		this.snapshot = this.selectionSnapshot
		this.handleStart()
		this.updateShapes()
		this.editor.on('tick', this.updateParent)
	}

	override onExit = () => {
		this.parent.currentToolIdMask = undefined
		this.editor.off('tick', this.updateParent)
		this.selectionSnapshot = {} as any
		this.snapshot = {} as any
		this.editor.snaps.clear()
		this.editor.updateInstanceState(
			{ cursor: { type: 'default', rotation: 0 } },
			{ ephemeral: true }
		)
		this.dragAndDropManager.clear()
	}

	override onPointerMove = () => {
		this.updateShapes()
	}

	override onKeyDown = () => {
		if (this.editor.inputs.altKey && !this.isCloning) {
			this.startCloning()
			return
		}

		// need to update in case user pressed a different modifier key
		this.updateShapes()
	}

	override onKeyUp: TLEventHandlers['onKeyUp'] = () => {
		if (!this.editor.inputs.altKey && this.isCloning) {
			this.stopCloning()
			return
		}

		// need to update in case user pressed a different modifier key
		this.updateShapes()
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	protected startCloning() {
		if (this.isCreating) return

		this.isCloning = true
		this.reset()
		this.markId = 'translating'
		this.editor.mark(this.markId)

		this.editor.duplicateShapes(Array.from(this.editor.selectedShapeIds))

		this.snapshot = getTranslatingSnapshot(this.editor)
		this.handleStart()
		this.updateShapes()
	}

	protected stopCloning() {
		this.isCloning = false
		this.snapshot = this.selectionSnapshot
		this.reset()
		this.markId = 'translating'
		this.editor.mark(this.markId)
		this.updateShapes()
	}

	updateParent = () => {
		const { snapshot } = this
		this.dragAndDropManager.updateDroppingNode(snapshot.movingShapes, this.updateParentTransforms)
	}

	reset() {
		this.editor.bailToMark(this.markId)
	}

	protected complete() {
		this.updateShapes()
		this.dragAndDropManager.dropShapes(this.snapshot.movingShapes)
		this.handleEnd()

		if (this.editor.instanceState.isToolLocked && this.info.onInteractionEnd) {
			this.editor.setCurrentTool(this.info.onInteractionEnd)
		} else {
			if (this.editAfterComplete) {
				const onlySelected = this.editor.onlySelectedShape
				if (onlySelected) {
					this.editor.setEditingShape(onlySelected.id)
					this.editor.setCurrentTool('select.editing_shape')
				}
			} else {
				this.parent.transition('idle', {})
			}
		}
	}

	private cancel() {
		this.reset()
		if (this.info.onInteractionEnd) {
			this.editor.setCurrentTool(this.info.onInteractionEnd)
		} else {
			this.parent.transition('idle', this.info)
		}
	}

	protected handleStart() {
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

	protected handleEnd() {
		const { movingShapes } = this.snapshot

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

	protected handleChange() {
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

	protected updateShapes() {
		const { snapshot } = this
		this.dragAndDropManager.updateDroppingNode(snapshot.movingShapes, this.updateParentTransforms)

		moveShapesToPoint({
			editor: this.editor,
			shapeSnapshots: snapshot.shapeSnapshots,
			averagePagePoint: snapshot.averagePagePoint,
			initialSelectionPageBounds: snapshot.initialPageBounds,
			initialSelectionSnapPoints: snapshot.initialSnapPoints,
		})

		this.handleChange()
	}

	protected updateParentTransforms = () => {
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
				: Matrix2d.Inverse(editor.getShapePageTransform(shape.parentId)!)

			shapeSnapshot.parentTransform = parentTransform
		})
	}
}

function getTranslatingSnapshot(editor: Editor) {
	const movingShapes: TLShape[] = []
	const pagePoints: Vec2d[] = []

	const shapeSnapshots = compact(
		editor.selectedShapeIds.map((id): null | MovingShapeSnapshot => {
			const shape = editor.getShape(id)
			if (!shape) return null
			movingShapes.push(shape)

			const pagePoint = editor.getShapePageTransform(id)!.point()
			if (!pagePoint) return null
			pagePoints.push(pagePoint)

			const parentTransform = PageRecordType.isId(shape.parentId)
				? null
				: Matrix2d.Inverse(editor.getShapePageTransform(shape.parentId)!)

			return {
				shape,
				pagePoint,
				parentTransform,
			}
		})
	)

	return {
		averagePagePoint: Vec2d.Average(pagePoints),
		movingShapes,
		shapeSnapshots,
		initialPageBounds: editor.selectionPageBounds!,
		initialSnapPoints:
			editor.selectedShapeIds.length === 1
				? editor.snaps.snapPointsCache.get(editor.selectedShapeIds[0])!
				: editor.selectionPageBounds
				? editor.selectionPageBounds.snapPoints.map((p, i) => ({
						id: 'selection:' + i,
						x: p.x,
						y: p.y,
				  }))
				: [],
	}
}

export type TranslatingSnapshot = ReturnType<typeof getTranslatingSnapshot>

export interface MovingShapeSnapshot {
	shape: TLShape
	pagePoint: Vec2d
	parentTransform: Matrix2dModel | null
}

export function moveShapesToPoint({
	editor,
	shapeSnapshots: snapshots,
	averagePagePoint,
	initialSelectionPageBounds,
	initialSelectionSnapPoints,
}: {
	editor: Editor
	shapeSnapshots: MovingShapeSnapshot[]
	averagePagePoint: Vec2d
	initialSelectionPageBounds: Box2d
	initialSelectionSnapPoints: SnapPoint[]
}) {
	const {
		inputs,
		instanceState: { isGridMode },
		documentSettings: { gridSize },
	} = editor

	const delta = Vec2d.Sub(inputs.currentPagePoint, inputs.originPagePoint)

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
	editor.snaps.clear()

	const shouldSnap =
		(editor.user.isSnapMode ? !inputs.ctrlKey : inputs.ctrlKey) &&
		editor.inputs.pointerVelocity.len() < 0.5 // ...and if the user is not dragging fast

	if (shouldSnap) {
		const { nudge } = editor.snaps.snapTranslate({
			dragDelta: delta,
			initialSelectionPageBounds,
			lockedAxis: flatten,
			initialSelectionSnapPoints,
		})

		delta.add(nudge)
	}

	const averageSnappedPoint = Vec2d.Add(averagePagePoint, delta)

	if (isGridMode && !inputs.ctrlKey) {
		averageSnappedPoint.snapToGrid(gridSize)
	}

	const averageSnap = Vec2d.Sub(averageSnappedPoint, averagePagePoint)

	editor.updateShapes(
		compact(
			snapshots.map(({ shape, pagePoint, parentTransform }): TLShapePartial | null => {
				const newPagePoint = Vec2d.Add(pagePoint, averageSnap)
				const newLocalPoint = parentTransform
					? Matrix2d.applyToPoint(parentTransform, newPagePoint)
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
