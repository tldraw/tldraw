import {
	BoundsSnapPoint,
	Editor,
	Mat,
	MatModel,
	PageRecordType,
	StateNode,
	TLArrowShapeProps,
	TLNoteShape,
	TLPointerEventInfo,
	TLShape,
	TLShapeId,
	TLShapePartial,
	TLTickEventInfo,
	Vec,
	bind,
	compact,
	createShapeId,
	isPageId,
	kickoutOccludedShapes,
} from '@tldraw/editor'
import { createOrUpdateArrowBinding } from '../../../shapes/arrow/shared'
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
	onInteractionEnd?: string | (() => void)
}

export class Translating extends StateNode {
	static override id = 'translating'

	info = {} as TranslatingInfo

	selectionSnapshot: TranslatingSnapshot = {} as any

	snapshot: TranslatingSnapshot = {} as any

	markId = ''

	isCloning = false
	isArrowConnecting = false
	cloneArrowIds: TLShapeId[] = []
	cloneSourceMap = new Map<TLShapeId, TLShapeId>() // cloneId -> originalId, used so we can bind connector arrows to the correct shapes
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
			if (this.editor.inputs.getAltKey()) {
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
		this.isArrowConnecting = false
		this.cloneArrowIds = []
		this.cloneSourceMap.clear()
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

		if (this.isCloning && this.editor.inputs.getCtrlKey() && !this.isArrowConnecting) {
			this.startArrowConnecting()
			return
		}

		// need to update in case user pressed a different modifier key
		this.updateShapes()
	}

	override onKeyUp() {
		if (!this.editor.inputs.getAltKey() && this.isCloning) {
			this.stopCloning()
			return
		}

		if (!this.editor.inputs.getCtrlKey() && this.isArrowConnecting) {
			this.stopArrowConnecting()
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

		// we only want to clone unlocked shapes
		let unlockedSelectedIds = this.editor
			.getSelectedShapeIds()
			.filter((id) => !this.editor.isShapeOrAncestorLocked(id))
		// const originalIds = Array.from(unlockedSelectedShapes.map((shape) => shape.id))

		// If we can't create the shapes, don't even start cloning
		if (!this.editor.canCreateShapes(unlockedSelectedIds)) return

		this.isCloning = true
		this.reset()
		this.markId = this.editor.markHistoryStoppingPoint('translate cloning')

		// recalculate unlocked selected shapes because this might have been changed by this.reset()
		unlockedSelectedIds = this.editor
			.getSelectedShapeIds()
			.filter((id) => !this.editor.isShapeOrAncestorLocked(id))

		this.editor.duplicateShapes(unlockedSelectedIds)

		// After duplication, selection contains the clones so we can build the map of cloneId -> originalId
		const cloneIds = Array.from(this.editor.getSelectedShapeIds()).filter(
			(id) => !this.editor.isShapeOrAncestorLocked(id)
		)
		this.cloneSourceMap.clear()
		for (let i = 0; i < unlockedSelectedIds.length; i++) {
			const cloneId = cloneIds[i]
			const originalId = unlockedSelectedIds[i]
			if (cloneId && originalId) {
				this.cloneSourceMap.set(cloneId, originalId)
			}
		}

		if (this.isCloning && this.editor.inputs.getCtrlKey() && !this.isArrowConnecting) {
			this.startArrowConnecting()
		}

		this.snapshot = getTranslatingSnapshot(this.editor)
		this.handleStart()
		this.updateShapes()
	}

	protected stopCloning() {
		this.isArrowConnecting = false
		this.cloneArrowIds = []
		this.cloneSourceMap.clear()
		this.isCloning = false
		this.snapshot = this.selectionSnapshot
		this.reset()
		this.markId = this.editor.markHistoryStoppingPoint('translate')
		this.updateShapes()
	}

	protected startArrowConnecting() {
		if (!this.isCloning || this.isArrowConnecting) return

		// Check we can create the arrow shapes
		const arrowCount = this.cloneSourceMap.size
		const placeholders = Array.from({ length: arrowCount }, () => ({ type: 'arrow' as const }))
		if (!this.editor.canCreateShapes(placeholders)) return

		this.isArrowConnecting = true
		const arrowIds: TLShapeId[] = []

		for (const [cloneId, originalId] of this.cloneSourceMap) {
			const originalShape = this.editor.getShape(originalId)
			if (!originalShape) continue

			const cloneShape = this.editor.getShape(cloneId)
			if (!cloneShape) continue

			if (
				!this.editor.canBindShapes({
					fromShape: { type: 'arrow' },
					toShape: originalShape,
					binding: 'arrow',
				}) ||
				!this.editor.canBindShapes({
					fromShape: { type: 'arrow' },
					toShape: cloneShape,
					binding: 'arrow',
				})
			) {
				continue
			}

			const styleOverrides = {
				...this.editor.getShapeUtil('arrow').getDefaultProps(),
				...getValidArrowStyleOverridesFromShape(this.editor, originalShape),
			}

			const arrowId = createShapeId()

			this.editor.createShape({
				id: arrowId,
				type: 'arrow',
				x: 0,
				y: 0,
				props: { ...styleOverrides },
			})

			createOrUpdateArrowBinding(this.editor, arrowId, originalId, {
				terminal: 'start',
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isExact: false,
				isPrecise: false,
				snap: 'none',
			})

			createOrUpdateArrowBinding(this.editor, arrowId, cloneId, {
				terminal: 'end',
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isExact: false,
				isPrecise: false,
				snap: 'none',
			})

			arrowIds.push(arrowId)
		}

		this.cloneArrowIds = arrowIds
	}

	protected stopArrowConnecting() {
		if (!this.isArrowConnecting) return
		this.isArrowConnecting = false

		if (this.cloneArrowIds.length > 0) {
			this.editor.deleteShapes(this.cloneArrowIds)
			this.cloneArrowIds = []
		}
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
			this.editor.inputs.getOriginPagePoint(),
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
			if (!shape) return
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

	const originPagePoint = editor.inputs.getOriginPagePoint()

	const allHoveredNotes = shapeSnapshots.filter(
		(s) => editor.isShapeOfType(s.shape, 'note') && editor.isPointInShape(s.shape, originPagePoint)
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

function getValidArrowStyleOverridesFromShape(
	editor: Editor,
	shape: TLShape
): Partial<TLArrowShapeProps> {
	const styleOverrides: Partial<TLArrowShapeProps> = {}

	for (const [style, propKey] of editor.styleProps['arrow']) {
		const value = editor.getShapeStyleIfExists(shape, style)
		if (value !== undefined) {
			styleOverrides[propKey as keyof TLArrowShapeProps] = value
		}
	}

	return styleOverrides
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

	const shiftKey = editor.inputs.getShiftKey()
	const accelKey = editor.inputs.getAccelKey()

	const isGridMode = editor.getInstanceState().isGridMode

	const gridSize = editor.getDocumentSettings().gridSize

	const delta = Vec.Sub(inputs.getCurrentPagePoint(), inputs.getOriginPagePoint())

	const flatten: 'x' | 'y' | null = shiftKey
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
	const isSnapping = editor.user.getIsSnapMode() ? !accelKey : accelKey
	let snappedToPit = false
	if (isSnapping && editor.inputs.getPointerVelocity().len() < 0.5) {
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

	// we don't want to snap to the grid if we're holding the accel key, if we've already snapped into a pit, or if we're showing snapping indicators
	const snapIndicators = editor.snaps.getIndicators()
	if (isGridMode && !accelKey && !snappedToPit && snapIndicators.length === 0) {
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
