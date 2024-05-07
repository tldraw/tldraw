import {
	BoundsSnapPoint,
	Editor,
	Mat,
	MatModel,
	PageRecordType,
	StateNode,
	TLEventHandlers,
	TLNoteShape,
	TLPointerEventInfo,
	TLShape,
	TLShapePartial,
	Vec,
	compact,
	isPageId,
	moveCameraWhenCloseToEdge,
} from '@tldraw/editor'
import {
	NOTE_PIT_RADIUS,
	NOTE_SIZE,
	getAvailableNoteAdjacentPositions,
} from '../../../shapes/note/noteHelpers'
import { DragAndDropManager } from '../DragAndDropManager'
import { kickoutOccludedShapes } from '../selectHelpers'

export class Translating extends StateNode {
	static override id = 'translating'

	info = {} as TLPointerEventInfo & {
		target: 'shape'
		isCreating?: boolean
		onCreate?: () => void
		didStartInPit?: boolean
		onInteractionEnd?: string
	}

	selectionSnapshot: TranslatingSnapshot = {} as any

	snapshot: TranslatingSnapshot = {} as any

	markId = ''

	isCloning = false
	isCreating = false
	onCreate: (shape: TLShape | null) => void = () => void null

	dragAndDropManager = new DragAndDropManager(this.editor)

	override onEnter = (
		info: TLPointerEventInfo & {
			target: 'shape'
			isCreating?: boolean
			onCreate?: () => void
			onInteractionEnd?: string
		}
	) => {
		const { isCreating = false, onCreate = () => void null } = info

		if (!this.editor.getSelectedShapeIds()?.length) {
			this.parent.transition('idle')
			return
		}

		this.info = info
		this.parent.setCurrentToolIdMask(info.onInteractionEnd)
		this.isCreating = isCreating
		this.onCreate = onCreate

		if (isCreating) {
			this.markId = `creating:${this.editor.getOnlySelectedShape()!.id}`
		} else {
			this.markId = 'translating'
			this.editor.mark(this.markId)
		}

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
	}

	override onExit = () => {
		this.parent.setCurrentToolIdMask(undefined)
		this.selectionSnapshot = {} as any
		this.snapshot = {} as any
		this.editor.snaps.clearIndicators()
		this.editor.setCursor({ type: 'default', rotation: 0 })
		this.dragAndDropManager.clear()
	}

	override onTick = () => {
		this.dragAndDropManager.updateDroppingNode(
			this.snapshot.movingShapes,
			this.updateParentTransforms
		)
		moveCameraWhenCloseToEdge(this.editor)
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

		this.editor.duplicateShapes(Array.from(this.editor.getSelectedShapeIds()))

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

	reset() {
		this.editor.bailToMark(this.markId)
	}

	protected complete() {
		this.updateShapes()
		this.dragAndDropManager.dropShapes(this.snapshot.movingShapes)
		kickoutOccludedShapes(
			this.editor,
			this.snapshot.movingShapes.map((s) => s.id)
		)
		this.handleEnd()

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

		this.dragAndDropManager.updateDroppingNode(snapshot.movingShapes, this.updateParentTransforms)

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
	let noteSnapshot: MovingShapeSnapshot | undefined

	const { originPagePoint } = editor.inputs

	const allHoveredNotes = shapeSnapshots.filter(
		(s) =>
			editor.isShapeOfType<TLNoteShape>(s.shape, 'note') &&
			editor.isPointInShape(s.shape, originPagePoint)
	)

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
			(noteSnapshot.shape as TLNoteShape).props.growY ?? 0
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
			let min = NOTE_PIT_RADIUS / editor.getZoomLevel() // in screen space
			let offset = new Vec(0, 0)

			const pageCenter = Vec.Add(
				Vec.Add(noteSnapshot.pagePoint, delta),
				new Vec(NOTE_SIZE / 2, NOTE_SIZE / 2).rot(noteSnapshot.pageRotation)
			)

			for (const pit of noteAdjacentPositions) {
				// We've already filtered pits with the same page rotation
				const deltaToPit = Vec.Sub(pageCenter, pit)
				const dist = deltaToPit.len()
				if (dist < min) {
					min = dist
					offset = deltaToPit
				}
			}

			delta.sub(offset)
		}
	}

	const averageSnappedPoint = Vec.Add(averagePagePoint, delta)

	if (isGridMode && !inputs.ctrlKey) {
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
