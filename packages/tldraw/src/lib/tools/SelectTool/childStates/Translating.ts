import {
	BoundsSnapPoint,
	Editor,
	Mat,
	MatModel,
	PageRecordType,
	StateNode,
	TLNoteShape,
	TLPointerEventInfo,
	TLShape,
	TLShapePartial,
	TLTickEventInfo,
	Vec,
	bind,
	compact,
	isPageId,
	kickoutOccludedShapes,
} from '@tldraw/editor'
import {
	NOTE_ADJACENT_POSITION_SNAP_RADIUS,
	NOTE_CENTER_OFFSET,
	getAvailableNoteAdjacentPositions,
} from '../../../shapes/note/noteHelpers'
import { DragAndDropManager } from '../DragAndDropManager'

export type TranslatingInfo = TLPointerEventInfo & {
	target: 'shape'
	isCreating?: boolean
	creatingMarkId?: string
	onCreate?(): void
	onInteractionEnd?: string
}

export class Translating extends StateNode {
	static override id = 'translating'

	info = {} as TranslatingInfo

	selectionSnapshot: TranslatingSnapshot = {} as any

	snapshot: TranslatingSnapshot = {} as any

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
		this.parent.setCurrentToolIdMask(info.onInteractionEnd)
		this.isCreating = isCreating

		this.markId = ''

		if (isCreating) {
			if (creatingMarkId) {
				this.markId = creatingMarkId
			} else {
				// handle legacy implicit `creating:{shapeId}` marks
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
		this.selectionSnapshot = getTranslatingSnapshot(this.editor)

		// Don't clone on create; otherwise clone on altKey
		if (!this.isCreating) {
			if (this.editor.inputs.altKey) {
				this.startCloning()
				if (this.isCloning) return
			}
		}

		this.snapshot = this.selectionSnapshot
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
		editor.edgeScrollManager.updateEdgeScrolling(elapsed)
	}

	override onPointerMove() {
		this.updateShapes()
	}

	override onKeyDown() {
		if (this.editor.inputs.altKey && !this.isCloning) {
			this.startCloning()
			if (this.isCloning) return
		}

		// need to update in case user pressed a different modifier key
		this.updateShapes()
	}

	override onKeyUp() {
		if (!this.editor.inputs.altKey && this.isCloning) {
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

		// If we can't create the shapes, don't even start cloning
		if (!this.editor.canCreateShapes(shapeIds)) return

		this.isCloning = true
		this.reset()
		this.markId = this.editor.markHistoryStoppingPoint('translate cloning')

		this.editor.duplicateShapes(Array.from(this.editor.getSelectedShapeIds()))

		this.snapshot = getTranslatingSnapshot(this.editor)
		this.handleStart()
		this.updateShapes()
	}

	protected stopCloning() {
		this.isCloning = false
		this.snapshot = this.selectionSnapshot
		this.reset()
		this.markId = this.editor.markHistoryStoppingPoint('translate')
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

		if (this.editor.getInstanceState().isToolLocked && this.info.onInteractionEnd) {
			this.editor.setCurrentTool(this.info.onInteractionEnd)
		} else {
			if (this.isCreating) {
				this.onCreate?.(this.editor.getOnlySelectedShape())
			} else {
				this.parent.transition('idle')
			}
		}
	}

	private cancel() {
		// Call onTranslateCancel callback before resetting
		const { movingShapes } = this.snapshot

		movingShapes.forEach((shape) => {
			const current = this.editor.getShape(shape.id)
			if (current) {
				const util = this.editor.getShapeUtil(shape)
				util.onTranslateCancel?.(shape, current)
			}
		})

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

		this.dragAndDropManager.startDraggingShapes(
			// Get fresh shapes from the snapshot, in case onTranslateStart mutates the shape
			compact(this.snapshot.movingShapes.map((s) => this.editor.getShape(s.id))),
			// Start from the place where the user started dragging
			this.editor.inputs.originPagePoint,
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

	protected updateShapes() {
		const { snapshot } = this

		// We should have started already, but hey
		this.dragAndDropManager.startDraggingShapes(
			snapshot.movingShapes,
			this.editor.inputs.originPagePoint,
			this.updateParentTransforms
		)

		moveShapesToPoint({
			editor: this.editor,
			snapshot,
		})

		const { movingShapes } = snapshot

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

	@bind
	protected updateParentTransforms() {
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

function getTranslatingSnapshot(editor: Editor) {
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

			const parentTransform = PageRecordType.isId(shape.parentId)
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

	const { originPagePoint } = editor.inputs

	const allHoveredNotes = shapeSnapshots.filter(
		(s) =>
			editor.isShapeOfType<TLNoteShape>(s.shape, 'note') &&
			editor.isPointInShape(s.shape, originPagePoint)
	) as (MovingShapeSnapshot & { shape: TLNoteShape })[]

	if (allHoveredNotes.length === 0) {
		// noop
	} else if (allHoveredNotes.length === 1) {
		// just one, easy
		noteSnapshot = allHoveredNotes[0]
	} else {
		// More than one under the cursor, so we need to find the highest shape in z-order
		const allShapesSorted = editor.getCurrentPageShapesSorted()
		noteSnapshot = allHoveredNotes
			.map((s) => ({
				snapshot: s,
				index: allShapesSorted.findIndex((shape) => shape.id === s.shape.id),
			}))
			.sort((a, b) => b.index - a.index)[0]?.snapshot // highest up first
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

export type TranslatingSnapshot = ReturnType<typeof getTranslatingSnapshot>

export interface MovingShapeSnapshot {
	shape: TLShape
	pagePoint: Vec
	pageRotation: number
	parentTransform: MatModel | null
}

export function moveShapesToPoint({
	editor,
	snapshot,
}: {
	editor: Editor
	snapshot: TranslatingSnapshot
}) {
	const { inputs } = editor

	const {
		noteSnapshot,
		noteAdjacentPositions,
		initialPageBounds,
		initialSnapPoints,
		shapeSnapshots,
		averagePagePoint,
	} = snapshot

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

	// If the user isn't moving super quick
	const isSnapping = editor.user.getIsSnapMode() ? !inputs.ctrlKey : inputs.ctrlKey
	let snappedToPit = false
	if (isSnapping && editor.inputs.pointerVelocity.len() < 0.5) {
		// snapping
		const { nudge } = editor.snaps.shapeBounds.snapTranslateShapes({
			dragDelta: delta,
			initialSelectionPageBounds: initialPageBounds,
			lockedAxis: flatten,
			initialSelectionSnapPoints: initialSnapPoints,
		})

		delta.add(nudge)
	} else {
		// for sticky notes, snap to grid position next to other notes
		if (noteSnapshot && noteAdjacentPositions) {
			const { scale } = noteSnapshot.shape.props
			const pageCenter = noteSnapshot.pagePoint
				.clone()
				.add(delta)
				// use the middle of the note, disregarding extra height
				.add(NOTE_CENTER_OFFSET.clone().mul(scale).rot(noteSnapshot.pageRotation))

			// Find the pit with the center closest to the put center
			let min = NOTE_ADJACENT_POSITION_SNAP_RADIUS / editor.getZoomLevel() // in screen space
			let offset = new Vec(0, 0)
			for (const pit of noteAdjacentPositions) {
				// We've already filtered pits with the same page rotation
				const deltaToPit = Vec.Sub(pageCenter, pit)
				const dist = deltaToPit.len()
				if (dist < min) {
					snappedToPit = true
					min = dist
					offset = deltaToPit
				}
			}

			delta.sub(offset)
		}
	}

	const averageSnappedPoint = Vec.Add(averagePagePoint, delta)

	// we don't want to snap to the grid if we're holding the ctrl key, if we've already snapped into a pit, or if we're showing snapping indicators
	const snapIndicators = editor.snaps.getIndicators()
	if (isGridMode && !inputs.ctrlKey && !snappedToPit && snapIndicators.length === 0) {
		averageSnappedPoint.snapToGrid(gridSize)
	}

	const averageSnap = Vec.Sub(averageSnappedPoint, averagePagePoint)

	editor.updateShapes(
		compact(
			shapeSnapshots.map(({ shape, pagePoint, parentTransform }): TLShapePartial | null => {
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
		)
	)
}
