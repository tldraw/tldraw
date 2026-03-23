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
	compact,
	isPageId,
	kickoutOccludedShapes,
} from '@tldraw/editor'
import { computeTranslateSnapDelta } from '../../../utils/translating-snapping'
import { getAvailableNoteAdjacentPositions } from '../noteHelpers'

export interface TranslatingCreatedNoteInfo {
	info: TLPointerEventInfo & { target: 'shape'; shape: TLShape }
	markId: string
	onCreate?(shape: TLShape | null): void
}

interface NoteTranslatingSnapshot {
	averagePagePoint: Vec
	movingShapes: TLShape[]
	shapeSnapshots: MovingShapeSnapshot[]
	initialPageBounds: import('@tldraw/editor').Box
	initialSnapPoints: BoundsSnapPoint[]
	noteAdjacentPositions?: Vec[]
	noteSnapshot?: (MovingShapeSnapshot & { shape: TLNoteShape }) | undefined
}

export class TranslatingCreatedNote extends StateNode {
	static override id = 'translating'

	interaction = new TranslateInteraction(this.editor)
	snapshot: NoteTranslatingSnapshot = {} as any
	markId = ''
	onCreate?: (shape: TLShape | null) => void

	override onEnter(info: TranslatingCreatedNoteInfo) {
		this.markId = info.markId
		this.onCreate = info.onCreate

		if (!this.editor.getSelectedShapeIds()?.length) {
			this.parent.transition('idle')
			return
		}

		this.editor.setCursor({ type: 'move', rotation: 0 })
		this.snapshot = getNoteTranslatingSnapshot(this.editor)

		this.interaction.start({ shapeIds: this.snapshot.movingShapes.map((s) => s.id) })
		this.editor.setHoveredShape(null)
		this.updateShapes()
	}

	override onExit() {
		this.snapshot = {} as any
		this.editor.snaps.clearIndicators()
		this.editor.setCursor({ type: 'default', rotation: 0 })
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
		this.updateShapes()
	}

	override onKeyUp() {
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

	private cancel() {
		this.interaction.cancel()
		this.editor.bailToMark(this.markId)
		this.parent.transition('idle')
	}

	private complete() {
		this.updateShapes()
		this.interaction.complete()
		kickoutOccludedShapes(
			this.editor,
			this.snapshot.movingShapes.map((s) => s.id)
		)

		if (this.editor.getInstanceState().isToolLocked) {
			this.parent.transition('idle')
			return
		}

		if (this.onCreate) {
			this.onCreate(this.editor.getOnlySelectedShape())
			return
		}

		this.editor.setCurrentTool('select', {})
	}

	private updateShapes() {
		const snapResult = computeTranslateSnapDelta(this.editor, this.snapshot)

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
}

function getNoteTranslatingSnapshot(editor: Editor): NoteTranslatingSnapshot {
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
