import {
	BoundsSnapPoint,
	Editor,
	Mat,
	MatModel,
	PageRecordType,
	TLNoteShape,
	TLShape,
	TLShapePartial,
	Vec,
	compact,
} from 'tldraw'
import { NOTE_PIT_RADIUS, NOTE_SIZE, getAvailableNoteAdjacentPositions } from './noteHelpers'

export interface MovingShapeSnapshot {
	shape: TLShape
	pagePoint: Vec
	pageRotation: number
	parentTransform: MatModel | null
}

export function getTranslatingSnapshot(editor: Editor) {
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
