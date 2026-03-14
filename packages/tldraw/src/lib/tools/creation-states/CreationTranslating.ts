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
import {
	NOTE_ADJACENT_POSITION_SNAP_RADIUS,
	NOTE_CENTER_OFFSET,
	getAvailableNoteAdjacentPositions,
} from '../../shapes/note/noteHelpers'

/** @public */
export interface CreationTranslatingInfo {
	info: TLPointerEventInfo & { target: 'shape'; shape: TLShape }
	markId: string
	onCreate?(shape: TLShape | null): void
}

// Extended snapshot with note-specific data
interface ExtendedSnapshot {
	averagePagePoint: Vec
	movingShapes: TLShape[]
	shapeSnapshots: MovingShapeSnapshot[]
	initialPageBounds: import('@tldraw/editor').Box
	initialSnapPoints: BoundsSnapPoint[]
	noteAdjacentPositions?: Vec[]
	noteSnapshot?: (MovingShapeSnapshot & { shape: TLNoteShape }) | undefined
}

/**
 * A state node for creation tools that need to translate a newly created shape.
 * Uses TranslateInteraction directly — no cross-tool transition or tool ID masking needed.
 *
 * @public
 */
export class CreationTranslating extends StateNode {
	static override id = 'translating'

	interaction = new TranslateInteraction(this.editor)
	snapshot: ExtendedSnapshot = {} as any
	markId = ''
	onCreate?: (shape: TLShape | null) => void

	override onEnter(info: CreationTranslatingInfo) {
		this.markId = info.markId
		this.onCreate = info.onCreate

		if (!this.editor.getSelectedShapeIds()?.length) {
			this.parent.transition('idle')
			return
		}

		this.editor.setCursor({ type: 'move', rotation: 0 })
		this.snapshot = getExtendedSnapshot(this.editor)

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

		// When tool-locked, return to tool idle without calling onCreate
		// (matches original behavior where onInteractionEnd fired before onCreate)
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
		const snapResult = this.computeSnapDelta()

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

	private computeSnapDelta(): { snapDelta?: Vec; skipGridSnap: boolean } {
		const { snapshot } = this
		const { inputs } = this.editor
		const shiftKey = inputs.getShiftKey()
		const accelKey = inputs.getAccelKey()

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

		this.editor.snaps.clearIndicators()

		const isSnapping = this.editor.user.getIsSnapMode() ? !accelKey : accelKey
		if (isSnapping && inputs.getPointerVelocity().len() < 0.5) {
			const { nudge } = this.editor.snaps.shapeBounds.snapTranslateShapes({
				dragDelta: delta,
				initialSelectionPageBounds: snapshot.initialPageBounds,
				lockedAxis: flatten,
				initialSelectionSnapPoints: snapshot.initialSnapPoints,
			})
			return { snapDelta: Vec.From(nudge), skipGridSnap: false }
		} else {
			if (snapshot.noteSnapshot && snapshot.noteAdjacentPositions) {
				const { scale } = snapshot.noteSnapshot.shape.props
				const pageCenter = snapshot.noteSnapshot.pagePoint
					.clone()
					.add(delta)
					.add(NOTE_CENTER_OFFSET.clone().mul(scale).rot(snapshot.noteSnapshot.pageRotation))

				let min = NOTE_ADJACENT_POSITION_SNAP_RADIUS / this.editor.getZoomLevel()
				let offset = new Vec(0, 0)
				let snappedToPit = false
				for (const pit of snapshot.noteAdjacentPositions) {
					const deltaToPit = Vec.Sub(pageCenter, pit)
					const dist = deltaToPit.len()
					if (dist < min) {
						snappedToPit = true
						min = dist
						offset = deltaToPit
					}
				}

				if (snappedToPit) {
					return {
						snapDelta: new Vec(-offset.x, -offset.y),
						skipGridSnap: true,
					}
				}
			}
		}

		return { skipGridSnap: false }
	}

	@bind
	private updateParentTransforms() {
		this.interaction.updateParentTransforms()
	}
}

function getExtendedSnapshot(editor: Editor): ExtendedSnapshot {
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
