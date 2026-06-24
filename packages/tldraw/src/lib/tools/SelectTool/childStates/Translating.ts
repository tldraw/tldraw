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
	TLShapeId,
	TLShapePartial,
	TLTickEventInfo,
	Vec,
	approximately,
	bind,
	compact,
	isPageId,
	kickoutOccludedShapes,
} from '@tldraw/editor'
import {
	NOTE_ADJACENT_POSITION_SNAP_RADIUS,
	getAvailableNoteAdjacentPositions,
} from '../../../shapes/note/noteHelpers'
import type { NoteShapeUtil } from '../../../shapes/note/NoteShapeUtil'
import { getDisplayValues } from '../../../shapes/shared/getDisplayValues'
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
	static override trackPerformance = true

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

	// True while we're applying our own changes to the moving shapes, so the
	// external-change listener can cheaply ignore them.
	private isApplyingChange = false

	// Set by the external-change listener when something outside this
	// interaction modifies a moving shape (e.g. a `rotateShapesBy` keyboard
	// shortcut). The next update rebases the snapshot onto the changed shapes.
	private snapshotChangedExternally = false

	private disposeExternalChangeListener?: () => void

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

		// Watch for changes made to the moving shapes from outside this
		// interaction. Detecting these from a listener keeps the per-frame update
		// path cheap: our own frequent writes set `isApplyingChange` and are
		// skipped in O(1), so the page-transform comparison below only runs on the
		// rare change that originates outside this interaction.
		this.snapshotChangedExternally = false
		this.disposeExternalChangeListener = this.editor.sideEffects.registerAfterChangeHandler(
			'shape',
			(_prev, next) => {
				if (this.isApplyingChange || this.snapshotChangedExternally) return
				if (this.didShapeChangeExternally(next.id)) {
					this.snapshotChangedExternally = true
				}
			}
		)

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
		this.disposeExternalChangeListener?.()
		this.disposeExternalChangeListener = undefined
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

	// Run a callback that writes our own changes to the moving shapes, marking
	// those writes so the external-change listener doesn't treat them as
	// external.
	private applyingChange<T>(fn: () => T): T {
		const wasApplyingChange = this.isApplyingChange
		this.isApplyingChange = true
		try {
			return fn()
		} finally {
			this.isApplyingChange = wasApplyingChange
		}
	}

	reset() {
		this.editor.bailToMark(this.markId)
		// Bailing restores the shapes to their snapshot positions, so any
		// previously applied drag offset no longer reflects the current shapes,
		// and the bail itself isn't an external change to react to.
		this.snapshot.lastAppliedOffset = null
		this.snapshotChangedExternally = false
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
		this.applyingChange(() => {
			// Translating computes shape positions from scratch on every update as
			// `snapshot position + drag delta`, so a change made to the moving
			// shapes from outside this interaction (e.g. `rotateShapesBy` bound to a
			// keyboard shortcut) would otherwise be stomped here. When the listener
			// has flagged such a change, re-anchor the snapshot onto the current
			// shapes first.
			if (this.snapshotChangedExternally) {
				this.foldExternalChangesIntoSnapshot()
				this.snapshotChangedExternally = false
			}

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
		})
	}

	// A moving shape whose page transform no longer matches `snapshot +
	// lastAppliedOffset` was changed by something other than this interaction:
	// translation only ever moves shapes by the applied offset. Reparenting,
	// which preserves a shape's page position, is intentionally not treated as an
	// external change.
	private didShapeChangeExternally(id: TLShapeId) {
		const { editor, snapshot } = this
		const { lastAppliedOffset } = snapshot
		if (!lastAppliedOffset) return false

		const shapeSnapshot = snapshot.shapeSnapshots.find((s) => s.shape.id === id)
		if (!shapeSnapshot) return false

		const pageTransform = editor.getShapePageTransform(id)
		if (!pageTransform) return true
		const pagePoint = pageTransform.point()
		return (
			!approximately(pagePoint.x, shapeSnapshot.pagePoint.x + lastAppliedOffset.x, 1e-4) ||
			!approximately(pagePoint.y, shapeSnapshot.pagePoint.y + lastAppliedOffset.y, 1e-4) ||
			!approximately(pageTransform.rotation(), shapeSnapshot.pageRotation, 1e-4)
		)
	}

	// Re-anchor each shape's snapshot origin onto its current position after an
	// external change, so the `snapshot + offset` math in `moveShapesToPoint`
	// continues from the changed position without jumping. We only need to fold
	// in position: translation never writes rotation, so an external rotation is
	// already preserved (it just moves the shape's page point, which we capture
	// here). The rest of the snapshot (note context, snap points, bounds) is left
	// as it was at drag start, which is a good-enough reference for the rare case
	// where something changes the shapes mid-drag.
	private foldExternalChangesIntoSnapshot() {
		const { editor, snapshot } = this
		const offset = snapshot.lastAppliedOffset ?? new Vec()

		for (const shapeSnapshot of snapshot.shapeSnapshots) {
			const pageTransform = editor.getShapePageTransform(shapeSnapshot.shape.id)
			if (!pageTransform) continue
			const live = pageTransform.point()
			// After this, `pagePoint + offset === live`, so re-applying the offset
			// keeps the shape where it is now.
			shapeSnapshot.pagePoint.x = live.x - offset.x
			shapeSnapshot.pagePoint.y = live.y - offset.y
			shapeSnapshot.pageRotation = pageTransform.rotation()
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
	let noteCenterOffset: Vec | undefined

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
		const noteUtil = editor.getShapeUtil(noteSnapshot.shape) as NoteShapeUtil
		const dv = getDisplayValues(noteUtil, noteSnapshot.shape)
		noteAdjacentPositions = getAvailableNoteAdjacentPositions(editor, {
			rotation: noteSnapshot.pageRotation,
			scale: noteSnapshot.shape.props.scale,
			extraHeight: noteSnapshot.shape.props.growY ?? 0,
			noteWidth: dv.noteWidth,
			noteHeight: dv.noteHeight,
		})
		noteCenterOffset = new Vec(dv.noteWidth / 2, dv.noteHeight / 2)
	}

	return {
		averagePagePoint: Vec.Average(pagePoints),
		movingShapes,
		shapeSnapshots,
		initialPageBounds: editor.getSelectionPageBounds()!,
		initialSnapPoints,
		noteAdjacentPositions,
		noteSnapshot,
		noteCenterOffset,
		// The page-space offset most recently applied to the snapshot shapes by
		// `moveShapesToPoint`, used to detect external changes to the shapes.
		lastAppliedOffset: null as Vec | null,
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
		noteCenterOffset,
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
		if (noteSnapshot && noteAdjacentPositions && noteCenterOffset) {
			const { scale } = noteSnapshot.shape.props
			const pageCenter = noteSnapshot.pagePoint
				.clone()
				.add(delta)
				// use the middle of the note, disregarding extra height
				.add(noteCenterOffset.clone().mul(scale).rot(noteSnapshot.pageRotation))

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

	snapshot.lastAppliedOffset = averageSnap

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
