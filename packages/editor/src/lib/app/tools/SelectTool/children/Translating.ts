import { Box2d, Matrix2d, Matrix2dModel, Vec2d } from '@tldraw/primitives'
import { PageRecordType, TLShape, TLShapePartial, isPageId } from '@tldraw/tlschema'
import { compact } from '@tldraw/utils'
import type { Editor } from '../../../Editor'
import { DragAndDropManager } from '../../../managers/DragAndDropManager'
import { SnapPoint } from '../../../managers/SnapManager'
import { TLEventHandlers, TLPointerEventInfo } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

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

	onEnter = (
		info: TLPointerEventInfo & {
			target: 'shape'
			isCreating?: boolean
			editAfterComplete?: boolean
			onInteractionEnd?: string
		}
	) => {
		const { isCreating = false, editAfterComplete = false } = info

		this.info = info
		this.isCreating = isCreating
		this.editAfterComplete = editAfterComplete

		this.markId = isCreating ? 'creating' : this.editor.mark('translating')
		this.handleEnter(info)
		this.editor.on('tick', this.updateParent)
	}

	updateParent = () => {
		const { snapshot } = this
		this.dragAndDropManager.updateDroppingNode(snapshot.movingShapes, this.updateParentTransforms)
	}

	onExit = () => {
		this.editor.off('tick', this.updateParent)
		this.selectionSnapshot = {} as any
		this.snapshot = {} as any
		this.editor.snaps.clear()
		this.editor.setCursor({ type: 'default' })
		this.dragAndDropManager.clear()
	}

	onPointerMove = () => {
		this.updateShapes()
	}

	onKeyDown = () => {
		if (this.editor.inputs.altKey && !this.isCloning) {
			this.startCloning()
			return
		}

		// need to update in case user pressed a different modifier key
		this.updateShapes()
	}

	onKeyUp: TLEventHandlers['onKeyUp'] = () => {
		if (!this.editor.inputs.altKey && this.isCloning) {
			this.stopCloning()
			return
		}

		// need to update in case user pressed a different modifier key
		this.updateShapes()
	}

	onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	reset() {
		this.editor.bailToMark(this.markId)
	}

	protected startCloning() {
		if (this.isCreating) return

		this.isCloning = true
		this.reset()
		this.markId = this.editor.mark('translating')

		this.editor.duplicateShapes()

		this.snapshot = getTranslatingSnapshot(this.editor)
		this.handleStart()
		this.updateShapes()
	}

	protected stopCloning() {
		this.isCloning = false
		this.snapshot = this.selectionSnapshot
		this.reset()
		this.markId = this.editor.mark('translating')
		this.updateShapes()
	}

	protected complete() {
		this.updateShapes()
		this.dragAndDropManager.dropShapes(this.snapshot.movingShapes)
		this.handleEnd()

		if (this.editor.instanceState.isToolLocked && this.info.onInteractionEnd) {
			this.editor.setSelectedTool(this.info.onInteractionEnd)
		} else {
			if (this.editAfterComplete) {
				const onlySelected = this.editor.onlySelectedShape
				if (onlySelected) {
					this.editor.setEditingId(onlySelected.id)
					this.editor.setSelectedTool('select')
					this.editor.root.current.value!.transition('editing_shape', {})
				}
			} else {
				this.parent.transition('idle', {})
			}
		}
	}

	private cancel() {
		this.reset()
		if (this.info.onInteractionEnd) {
			this.editor.setSelectedTool(this.info.onInteractionEnd)
		} else {
			this.parent.transition('idle', this.info)
		}
	}

	protected handleEnter(info: TLPointerEventInfo & { target: 'shape' }) {
		this.isCloning = false
		this.info = info

		this.editor.setCursor({ type: 'move' })
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
	}

	protected handleEnd() {
		const { movingShapes } = this.snapshot

		const changes: TLShapePartial[] = []

		movingShapes.forEach((shape) => {
			const current = this.editor.getShapeById(shape.id)!
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
			const current = this.editor.getShapeById(shape.id)!
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
			const shape = editor.getShapeById(shapeSnapshot.shape.id)
			if (!shape) return null
			movingShapes.push(shape)

			const parentTransform = isPageId(shape.parentId)
				? null
				: Matrix2d.Inverse(editor.getPageTransformById(shape.parentId)!)

			shapeSnapshot.parentTransform = parentTransform
		})
	}
}

function getTranslatingSnapshot(editor: Editor) {
	const movingShapes: TLShape[] = []
	const pagePoints: Vec2d[] = []

	const shapeSnapshots = compact(
		editor.selectedIds.map((id): null | MovingShapeSnapshot => {
			const shape = editor.getShapeById(id)
			if (!shape) return null
			movingShapes.push(shape)

			const pagePoint = editor.getPagePointById(id)
			if (!pagePoint) return null
			pagePoints.push(pagePoint)

			const parentTransform = PageRecordType.isId(shape.parentId)
				? null
				: Matrix2d.Inverse(editor.getPageTransformById(shape.parentId)!)

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
		initialPageBounds: editor.selectedPageBounds!,
		initialSnapPoints:
			editor.selectedIds.length === 1
				? editor.snaps.snapPointsCache.get(editor.selectedIds[0])!
				: editor.selectedPageBounds
				? editor.selectedPageBounds.snapPoints.map((p, i) => ({
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
	const { inputs, isGridMode, gridSize } = editor

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
		(editor.isSnapMode ? !inputs.ctrlKey : inputs.ctrlKey) &&
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
		true
	)
}
