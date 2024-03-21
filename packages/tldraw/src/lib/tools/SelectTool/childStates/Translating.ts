import {
	BoundsSnapPoint,
	Box,
	Editor,
	Mat,
	MatModel,
	PageRecordType,
	StateNode,
	TLArrowShape,
	TLEventHandlers,
	TLNoteShape,
	TLPointerEventInfo,
	TLShape,
	TLShapeId,
	TLShapePartial,
	TLTickEventHandler,
	Vec,
	compact,
	isPageId,
	moveCameraWhenCloseToEdge,
} from '@tldraw/editor'
import { DragAndDropManager } from '../DragAndDropManager'

export class Translating extends StateNode {
	static override id = 'translating'

	info = {} as TLPointerEventInfo & {
		target: 'shape' | 'preview'
		isCreating?: boolean
		onCreate?: () => void
		onInteractionEnd?: string
	}

	selectionSnapshot: TranslatingSnapshot = {} as any

	snapshot: TranslatingSnapshot = {} as any

	markId = ''

	isCloning = false
	isCreating = false
	isDirty = false
	previewNote = null as TLNoteShape | null
	previewArrow = null as TLArrowShape | null
	originalNote = null as TLNoteShape | null
	previewBound = null as TLShapeId | null
	onCreate: (shape: TLShape | null) => void = () => void null

	dragAndDropManager = new DragAndDropManager(this.editor)

	override onEnter = (
		info: TLPointerEventInfo & {
			ids?: TLShapeId[]
			target: 'shape' | 'preview'
			isCreating?: boolean
			onCreate?: () => void
			onInteractionEnd?: string
		}
	) => {
		const { isCreating = false, onCreate = () => void null } = info

		this.info = info
		this.isDirty = false
		this.parent.setCurrentToolIdMask(info.onInteractionEnd)
		this.isCreating = isCreating
		this.onCreate = onCreate
		if (info.target === 'preview') {
			if (info.ids) {
				const [note, arrow] = info.ids
				const previewNote = this.editor.getShape(note) as TLNoteShape
				const previewArrow = this.editor.getShape(arrow) as TLArrowShape
				const originalNote = this.editor.getShape(
					// @ts-ignore
					previewArrow.props.start.boundShapeId
				) as TLNoteShape

				this.previewNote = previewNote
				this.previewArrow = previewArrow
				this.originalNote = originalNote
			}
		}
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
		this.editor.updateInstanceState(
			{ cursor: { type: 'default', rotation: 0 } },
			{ ephemeral: true }
		)
		this.dragAndDropManager.clear()
	}

	override onTick: TLTickEventHandler = () => {
		this.dragAndDropManager.updateDroppingNode(
			this.snapshot.movingShapes,
			this.updateParentTransforms
		)
		moveCameraWhenCloseToEdge(this.editor)
		if (this.isDirty) {
			this.isDirty = false
			this.updateShapes()
		}
	}

	override onPointerMove = () => {
		const hoveringNoteShape = this.overNoteShape() as TLNoteShape | undefined

		if (
			hoveringNoteShape &&
			this.previewArrow &&
			this.previewNote &&
			hoveringNoteShape.id !== this.previewBound
		) {
			const hasArrowBoundFromOriginalNote = this.arrowFromOriginalNoteToNewNote(
				hoveringNoteShape.id
			)

			if (!hasArrowBoundFromOriginalNote) {
				this.editor.updateShape({
					type: 'arrow',
					id: this.previewArrow.id,
					props: {
						end: {
							...this.previewArrow.props.end,
							boundShapeId: hoveringNoteShape.id,
						},
					},
				})
				this.editor.updateShape({
					type: 'note',
					id: this.previewNote.id,
					opacity: 0,
				})
				this.previewBound = hoveringNoteShape.id
			}
		} else {
			if (!hoveringNoteShape && this.previewBound && this.previewArrow && this.previewNote) {
				this.editor.updateShape({
					type: 'arrow',
					id: this.previewArrow.id,
					props: {
						end: {
							...this.previewArrow.props.end,
							boundShapeId: this.previewNote.id,
						},
					},
				})
				this.editor.updateShape({
					type: 'note',
					id: this.previewNote.id,
					opacity: 0.25,
				})
				this.previewBound = null
			}
		}

		this.isDirty = true
	}

	arrowFromOriginalNoteToNewNote = (hoveringNoteId: TLShapeId): boolean => {
		return (
			this.editor
				.getCurrentPageShapes()
				.filter((s) => s.type === 'arrow')
				.filter(
					(s): s is TLArrowShape =>
						// @ts-ignore
						s.props.start.boundShapeId === this.originalNote?.id &&
						// @ts-ignore
						s.props.end.boundShapeId === hoveringNoteId
				).length > 0
		)
	}
	overNoteShape = () => {
		return this.editor
			.getShapesAtPoint(this.editor.inputs.currentPagePoint)
			.filter(
				(s) => s.type === 'note' && s.id !== this.originalNote?.id && s.id !== this.previewNote?.id
			)[0]
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
		if (this.previewNote && this.previewArrow) {
			if (this.previewBound) {
				this.editor.deleteShapes([this.previewNote.id])
			}
			if (this.previewNote) {
				this.editor.updateShape({ type: 'note', id: this.previewNote!.id, opacity: 1 })
			}

			this.editor.updateShape({ type: 'arrow', id: this.previewArrow!.id, opacity: 1 })
		}
		this.cleanupPreviewIds()
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
		this.isDirty = false
		this.dragAndDropManager.dropShapes(this.snapshot.movingShapes)
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
		if (this.previewNote && this.previewArrow) {
			this.editor.deleteShapes([this.previewNote.id, this.previewArrow.id])
		}
		this.cleanupPreviewIds()
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
				: Mat.Inverse(editor.getShapePageTransform(shape.parentId)!)

			shapeSnapshot.parentTransform = parentTransform
		})
	}
	private cleanupPreviewIds = () => {
		this.previewArrow = null
		this.previewNote = null
		this.originalNote = null
	}
}

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

export type TranslatingSnapshot = ReturnType<typeof getTranslatingSnapshot>

export interface MovingShapeSnapshot {
	shape: TLShape
	pagePoint: Vec
	parentTransform: MatModel | null
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
