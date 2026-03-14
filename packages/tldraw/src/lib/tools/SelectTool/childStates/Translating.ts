import type { MovingShapeSnapshot } from '@tldraw/editor'
import {
	BoundsSnapPoint,
	Editor,
	Mat,
	StateNode,
	TLNoteShape,
	TLPointerEventInfo,
	TLShape,
	TLTickEventInfo,
	TranslateInteraction,
	Vec,
	bind,
	compact,
	isPageId,
	kickoutOccludedShapes,
} from '@tldraw/editor'
import { getAvailableNoteAdjacentPositions } from '../../../shapes/note/noteHelpers'
import { computeTranslateSnapDelta } from '../../../utils/translating-snapping'
import { DragAndDropManager } from '../DragAndDropManager'

export type TranslatingInfo = TLPointerEventInfo & {
	target: 'shape'
	isCreating?: boolean
	creatingMarkId?: string
	onCreate?(): void
	onInteractionEnd?: string | (() => void)
}

export class Translating extends StateNode {
	static override id = 'translating'

	info = {} as TranslatingInfo

	interaction = new TranslateInteraction(this.editor)

	/** Full selection snapshot (kept for stopCloning to restore). */
	selectionSnapshot: ExtendedTranslatingSnapshot = {} as any

	/** Active snapshot — may be swapped when cloning starts/stops. */
	snapshot: ExtendedTranslatingSnapshot = {} as any

	markId = ''

	isCloning = false
	isCreating = false
	onCreate(_shape: TLShape | null): void {
		return
	}

	dragAndDropManager = new DragAndDropManager(this.editor)

	override onEnter(info: TranslatingInfo) {
		const { isCreating = false, creatingMarkId, onCreate = () => void null } = info

		if (!this.editor.getSelectedShapeIds()?.length) {
			this.parent.transition('idle')
			return
		}

		this.info = info
		if (typeof info.onInteractionEnd === 'string') {
			this.parent.setCurrentToolIdMask(info.onInteractionEnd)
		}
		this.isCreating = isCreating

		this.markId = ''

		if (isCreating) {
			if (creatingMarkId) {
				this.markId = creatingMarkId
			} else {
				const markId = this.editor.getMarkIdMatching(
					`creating:${this.editor.getOnlySelectedShapeId()}`
				)
				if (markId) {
					this.markId = markId
				}
			}
		} else {
			this.markId = this.editor.markHistoryStoppingPoint('translating')
		}

		this.onCreate = onCreate

		this.isCloning = false
		this.info = info

		this.editor.setCursor({ type: 'move', rotation: 0 })
		this.selectionSnapshot = getExtendedTranslatingSnapshot(this.editor)

		// Don't clone on create; otherwise clone on altKey
		if (!this.isCreating) {
			if (this.editor.inputs.getAltKey()) {
				this.startCloning()
				if (this.isCloning) return
			}
		}

		this.snapshot = this.selectionSnapshot
		this.interaction.start({ shapeIds: this.snapshot.movingShapes.map((s) => s.id) })
		this.handleStart()
		this.updateShapes()
	}

	override onExit() {
		this.parent.setCurrentToolIdMask(undefined)
		this.selectionSnapshot = {} as any
		this.snapshot = {} as any
		this.editor.snaps.clearIndicators()
		this.editor.setCursor({ type: 'default', rotation: 0 })
		this.dragAndDropManager.clear()
	}

	override onTick({ elapsed }: TLTickEventInfo) {
		const { editor } = this
		if (!editor.inputs.getIsDragging() || editor.inputs.getIsPanning()) return
		editor.edgeScrollManager.updateEdgeScrolling(elapsed)
	}

	override onPointerMove() {
		this.updateShapes()
	}

	override onKeyDown() {
		if (this.editor.inputs.getAltKey() && !this.isCloning) {
			this.startCloning()
			if (this.isCloning) return
		}

		// need to update in case user pressed a different modifier key
		this.updateShapes()
	}

	override onKeyUp() {
		if (!this.editor.inputs.getAltKey() && this.isCloning) {
			this.stopCloning()
			return
		}

		// need to update in case user pressed a different modifier key
		this.updateShapes()
	}

	override onPointerUp() {
		this.complete()
	}

	override onComplete() {
		this.complete()
	}

	override onCancel() {
		this.cancel()
	}

	protected startCloning() {
		if (this.isCreating) return
		const shapeIds = Array.from(this.editor.getSelectedShapeIds())

		if (!this.editor.canCreateShapes(shapeIds)) return

		this.isCloning = true
		this.reset()
		this.markId = this.editor.markHistoryStoppingPoint('translate cloning')

		this.editor.duplicateShapes(Array.from(this.editor.getSelectedShapeIds()))

		this.snapshot = getExtendedTranslatingSnapshot(this.editor)
		this.interaction.restart(this.snapshot.movingShapes.map((s) => s.id))
		this.handleStart()
		this.updateShapes()
	}

	protected stopCloning() {
		this.isCloning = false
		this.snapshot = this.selectionSnapshot
		this.reset()
		this.markId = this.editor.markHistoryStoppingPoint('translate')
		this.interaction.restart(this.snapshot.movingShapes.map((s) => s.id))
		this.updateShapes()
	}

	reset() {
		this.editor.bailToMark(this.markId)
	}

	protected complete() {
		this.updateShapes()
		this.dragAndDropManager.dropShapes(this.snapshot.movingShapes)
		this.handleEnd()
		kickoutOccludedShapes(
			this.editor,
			this.snapshot.movingShapes.map((s) => s.id)
		)

		const { onInteractionEnd } = this.info
		if (onInteractionEnd) {
			if (typeof onInteractionEnd === 'string') {
				if (this.editor.getInstanceState().isToolLocked) {
					this.editor.setCurrentTool(onInteractionEnd)
					return
				}
			} else {
				onInteractionEnd()
				return
			}
		}

		if (this.isCreating) {
			this.onCreate?.(this.editor.getOnlySelectedShape())
		} else {
			this.parent.transition('idle')
		}
	}

	private cancel() {
		this.interaction.cancel()
		this.reset()

		const { onInteractionEnd } = this.info
		if (onInteractionEnd) {
			if (typeof onInteractionEnd === 'string') {
				this.editor.setCurrentTool(onInteractionEnd)
			} else {
				onInteractionEnd()
			}
			return
		}
		this.parent.transition('idle', this.info)
	}

	protected handleStart() {
		// The interaction already called onTranslateStart, so we just need
		// to set up drag-and-drop.
		this.dragAndDropManager.startDraggingShapes(
			compact(this.snapshot.movingShapes.map((s) => this.editor.getShape(s.id))),
			this.editor.inputs.getOriginPagePoint(),
			this.updateParentTransforms
		)

		this.editor.setHoveredShape(null)
	}

	protected handleEnd() {
		const { movingShapes } = this.snapshot

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

		this.interaction.complete()
	}

	protected updateShapes() {
		const { snapshot } = this

		// Ensure drag-and-drop is active
		this.dragAndDropManager.startDraggingShapes(
			snapshot.movingShapes,
			this.editor.inputs.getOriginPagePoint(),
			this.updateParentTransforms
		)

		const snapResult = computeTranslateSnapDelta(this.editor, snapshot)

		const shiftKey = this.editor.inputs.getShiftKey()
		const delta = Vec.Sub(
			this.editor.inputs.getCurrentPagePoint(),
			this.editor.inputs.getOriginPagePoint()
		)
		const flatten: 'x' | 'y' | null = shiftKey
			? Math.abs(delta.x) < Math.abs(delta.y)
				? 'x'
				: 'y'
			: null

		this.interaction.update({
			snapDelta: snapResult.snapDelta,
			flatten,
			skipGridSnap: snapResult.skipGridSnap,
		})
	}

	@bind
	protected updateParentTransforms() {
		this.interaction.updateParentTransforms()
	}
}

// Extended snapshot that includes note-specific data (lives in tldraw, not editor)
interface ExtendedTranslatingSnapshot {
	averagePagePoint: Vec
	movingShapes: TLShape[]
	shapeSnapshots: MovingShapeSnapshot[]
	initialPageBounds: import('@tldraw/editor').Box
	initialSnapPoints: BoundsSnapPoint[]
	noteAdjacentPositions?: Vec[]
	noteSnapshot?: (MovingShapeSnapshot & { shape: TLNoteShape }) | undefined
}

function getExtendedTranslatingSnapshot(editor: Editor): ExtendedTranslatingSnapshot {
	const movingShapes: TLShape[] = []
	const pagePoints: Vec[] = []

	const selectedShapeIds = editor.getSelectedShapeIds()
	const shapeSnapshots = compact(
		selectedShapeIds.map((id): null | MovingShapeSnapshot => {
			const shape = editor.getShape(id)
			if (!shape) return null
			movingShapes.push(shape)

			const pageTransform = editor.getShapePageTransform(id)
			const pagePoint = pageTransform.point()
			const pageRotation = pageTransform.rotation()

			pagePoints.push(pagePoint)

			const parentTransform = isPageId(shape.parentId)
				? null
				: Mat.Inverse(editor.getShapePageTransform(shape.parentId)!)

			return {
				shape,
				pagePoint,
				pageRotation,
				parentTransform,
			}
		})
	)

	const onlySelectedShape = editor.getOnlySelectedShape()

	let initialSnapPoints: BoundsSnapPoint[] = []

	if (onlySelectedShape) {
		initialSnapPoints = editor.snaps.shapeBounds.getSnapPoints(onlySelectedShape.id)!
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

	let noteAdjacentPositions: Vec[] | undefined
	let noteSnapshot: (MovingShapeSnapshot & { shape: TLNoteShape }) | undefined

	const originPagePoint = editor.inputs.getOriginPagePoint()

	const allHoveredNotes = shapeSnapshots.filter(
		(s) => editor.isShapeOfType(s.shape, 'note') && editor.isPointInShape(s.shape, originPagePoint)
	) as (MovingShapeSnapshot & { shape: TLNoteShape })[]

	if (allHoveredNotes.length === 0) {
		// noop
	} else if (allHoveredNotes.length === 1) {
		noteSnapshot = allHoveredNotes[0]
	} else {
		const allShapesSorted = editor.getCurrentPageShapesSorted()
		noteSnapshot = allHoveredNotes
			.map((s) => ({
				snapshot: s,
				index: allShapesSorted.findIndex((shape) => shape.id === s.shape.id),
			}))
			.sort((a, b) => b.index - a.index)[0]?.snapshot
	}

	if (noteSnapshot) {
		noteAdjacentPositions = getAvailableNoteAdjacentPositions(
			editor,
			noteSnapshot.pageRotation,
			noteSnapshot.shape.props.scale,
			noteSnapshot.shape.props.growY ?? 0
		)
	}

	return {
		averagePagePoint: Vec.Average(pagePoints),
		movingShapes,
		shapeSnapshots,
		initialPageBounds: editor.getSelectionPageBounds()!,
		initialSnapPoints,
		noteAdjacentPositions,
		noteSnapshot,
	}
}

export { type ExtendedTranslatingSnapshot as TranslatingSnapshot }
export type { MovingShapeSnapshot }
