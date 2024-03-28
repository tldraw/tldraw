import {
	BoundsSnapPoint,
	Box,
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
	VecLike,
	compact,
	isPageId,
	moveCameraWhenCloseToEdge,
} from '@tldraw/editor'

import { NOTE_GRID_OFFSET, NOTE_SIZE } from '../../../shapes/note/NoteShapeUtil'
import { DragAndDropManager } from '../DragAndDropManager'

export class Translating extends StateNode {
	static override id = 'translating'

	info = {} as TLPointerEventInfo & {
		target: 'shape'
		isCreating?: boolean
		onCreate?: () => void
		onInteractionEnd?: string
	}

	selectionSnapshot: TranslatingSnapshot = {} as any

	snapshot: TranslatingSnapshot = {} as any

	markId = ''

	isCloning = false
	isCreating = false
	oneNoteShapeSelected = false
	firstCheck = true
	checkForStickyPit = true
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

		const oneNoteShapeSelected =
			this.selectionSnapshot.movingShapes.length === 1 &&
			this.selectionSnapshot.movingShapes[0].type === 'note'
		if (oneNoteShapeSelected) {
			this.oneNoteShapeSelected = true
		}
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
		this.oneNoteShapeSelected = false
		this.firstCheck = true
	}

	override onTick = () => {
		this.dragAndDropManager.updateDroppingNode(
			this.snapshot.movingShapes,
			this.updateParentTransforms
		)
		moveCameraWhenCloseToEdge(this.editor)
	}

	override onPointerMove = () => {
		let stickyPit = undefined
		if (this.oneNoteShapeSelected) {
			const selectedNote = this.selectionSnapshot.movingShapes[0] as TLNoteShape
			stickyPit = getStickyPit(this.editor, selectedNote)
		}

		this.updateShapes(stickyPit)
		this.firstCheck = false
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
		if (!this.oneNoteShapeSelected) {
			// We don't want the shape to jump out of the pit when the user releases the mouse
			this.updateShapes()
		}
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

	protected updateShapes(stickyPit?: VecLike | undefined) {
		const { snapshot } = this
		this.dragAndDropManager.updateDroppingNode(snapshot.movingShapes, this.updateParentTransforms)
		const info = moveShapesToPoint({
			editor: this.editor,
			shapeSnapshots: snapshot.shapeSnapshots,
			averagePagePoint: snapshot.averagePagePoint,
			initialSelectionPageBounds: snapshot.initialPageBounds,
			initialSelectionSnapPoints: snapshot.initialSnapPoints,
			stickyPit,
			firstCheck: this.firstCheck,
			checkForStickyPit: this.checkForStickyPit,
		})
		if (info) {
			// console.log({ info })
			this.checkForStickyPit = info.checkForStickyPit
		}

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
}

export function getStickyPit(editor: Editor, selectedNote?: TLNoteShape) {
	const findNearestNoteShape = (): TLNoteShape | undefined => {
		const currentPagePoint = editor.inputs.currentPagePoint
		return editor
			.getCurrentPageShapes()
			.filter((shape) => shape.type === 'note')
			.filter((shape) => {
				if (selectedNote) return shape.id !== selectedNote.id
				else return false
			})
			.filter((shape) => {
				const distance = Vec.Dist(
					{ x: shape.x + NOTE_SIZE / 2, y: shape.y + NOTE_SIZE / 2 },
					currentPagePoint
				)
				return distance < 350
			})
			.sort((a, b) => {
				const distanceA = Vec.Dist(
					{ x: a.x + NOTE_SIZE / 2, y: a.y + NOTE_SIZE / 2 },
					currentPagePoint
				)
				const distanceB = Vec.Dist(
					{ x: b.x + NOTE_SIZE / 2, y: b.y + NOTE_SIZE / 2 },
					currentPagePoint
				)
				return distanceA - distanceB
			})[0] as TLNoteShape
	}
	const nearestNoteShape = findNearestNoteShape()

	let direction: 'above' | 'below' | 'left' | 'right' | null = null
	if (!nearestNoteShape) return undefined
	if (
		nearestNoteShape.y - editor.inputs.currentPagePoint.y > 0 &&
		nearestNoteShape.x - editor.inputs.currentPagePoint.x < 0 &&
		nearestNoteShape.x + NOTE_SIZE - editor.inputs.currentPagePoint.x > 0
	) {
		direction = 'above'
	} else if (
		nearestNoteShape.y + NOTE_SIZE - editor.inputs.currentPagePoint.y < 0 &&
		nearestNoteShape.x - editor.inputs.currentPagePoint.x < 0 &&
		nearestNoteShape.x + NOTE_SIZE - editor.inputs.currentPagePoint.x > 0
	) {
		direction = 'below'
	} else if (
		nearestNoteShape.x - editor.inputs.currentPagePoint.x > 0 &&
		nearestNoteShape.y - editor.inputs.currentPagePoint.y < 0 &&
		nearestNoteShape.y + NOTE_SIZE - editor.inputs.currentPagePoint.y > 0
	) {
		direction = 'left'
	} else if (
		nearestNoteShape.x + NOTE_SIZE - editor.inputs.currentPagePoint.x < 0 &&
		nearestNoteShape.y - editor.inputs.currentPagePoint.y < 0 &&
		nearestNoteShape.y + NOTE_SIZE - editor.inputs.currentPagePoint.y > 0
	) {
		direction = 'right'
	}
	const getNearestStickyPit = (noteShape: TLShape | undefined): VecLike | undefined => {
		if (!noteShape) return undefined

		const noteShapeCenter = { x: noteShape.x + NOTE_SIZE / 2, y: noteShape.y + NOTE_SIZE / 2 }
		switch (direction) {
			case 'above':
				return { x: noteShapeCenter.x, y: noteShapeCenter.y - NOTE_GRID_OFFSET }
			case 'below':
				return { x: noteShapeCenter.x, y: noteShapeCenter.y + NOTE_GRID_OFFSET }
			case 'left':
				return { x: noteShapeCenter.x - NOTE_GRID_OFFSET, y: noteShapeCenter.y }
			case 'right':
				return { x: noteShapeCenter.x + NOTE_GRID_OFFSET, y: noteShapeCenter.y }
			default:
				return
		}
	}
	const stickyPit = getNearestStickyPit(nearestNoteShape)
	if (!stickyPit) return undefined
	return stickyPit
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
	stickyPit,
	firstCheck,
	checkForStickyPit,
}: {
	editor: Editor
	shapeSnapshots: MovingShapeSnapshot[]
	averagePagePoint: Vec
	initialSelectionPageBounds: Box
	initialSelectionSnapPoints: BoundsSnapPoint[]
	stickyPit?: VecLike
	firstCheck: boolean
	checkForStickyPit: boolean
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
	if (stickyPit && editor.inputs.pointerVelocity.len() < 0.5) {
		const noteShape = editor.getShape(snapshots[0].shape.id)
		const distance = Vec.Dist({ x: noteShape!.x + 100, y: noteShape!.y + 100 }, stickyPit)
		if (!checkForStickyPit && distance > 20) {
			return { checkForStickyPit: true }
		}
		if (distance < 20 && firstCheck) {
			return { checkForStickyPit: false }
		} else if (distance < 20 && checkForStickyPit) {
			editor.updateShape({
				...snapshots[0].shape,
				x: stickyPit.x - 100,
				y: stickyPit.y - 100,
			})
			return { checkForStickyPit: true }
		}
	}
}
