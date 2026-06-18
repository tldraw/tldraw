import {
	Mat,
	TLDefaultColorStyle,
	TLDrawShape,
	TLPointerEventInfo,
	TLShapeId,
	Vec,
	areArraysShallowEqual,
	b64Vecs,
	pointInPolygon,
} from '@tldraw/editor'
import { Drawing } from '../../shapes/draw/toolStates/Drawing'
import {
	MAGIC_WAND_INKING_CLASS,
	MAGIC_WAND_INK_OPACITY,
	MAGIC_WAND_LASSO_COLOR,
	dryMagicWandInk,
	fadeOutLassoInk,
} from './magicWandInk'

/**
 * The drawing state for the magic wand tool. It behaves like the regular draw
 * tool while the stroke is in progress, but on completion it checks whether the
 * stroke forms a closed loop around existing shapes. If it does, the stroke is
 * discarded and the encircled shapes are selected instead (a lasso gesture).
 *
 * While drawing, the ink previews the outcome: it turns the selection colour
 * whenever releasing at the current point would lasso-select something.
 */
export class MagicWandDrawing extends Drawing {
	// Shapes that existed before this stroke started, so we never try to lasso
	// the stroke shape(s) created during the gesture.
	private shapeIdsBeforeGesture = new Set<TLShapeId>()

	// The stroke's natural colour, restored when the gesture stops being a lasso.
	private inkColor: TLDefaultColorStyle = 'black'
	// Whether the ink is currently showing the selection (lasso) colour.
	private inkShowsLassoColor = false
	// The shapes currently previewed as "would be selected" (blue hint outline).
	private hintedShapeIds: TLShapeId[] = []

	override onEnter(info: TLPointerEventInfo) {
		this.shapeIdsBeforeGesture = new Set(this.editor.getCurrentPageShapeIds())
		this.inkShowsLassoColor = false
		this.hintedShapeIds = []
		// Enable the CSS colour transition for the in-progress stroke.
		this.editor.getContainer().classList.add(MAGIC_WAND_INKING_CLASS)
		super.onEnter(info)
		// Draw the in-progress stroke at half opacity (the "wet ink" look).
		const inkShape = this.initialShape && this.editor.getShape<TLDrawShape>(this.initialShape.id)
		if (inkShape) {
			this.inkColor = inkShape.props.color
			this.editor.run(
				() =>
					this.editor.updateShape({
						id: inkShape.id,
						type: 'draw',
						opacity: MAGIC_WAND_INK_OPACITY,
					}),
				{ history: 'ignore' }
			)
		}
	}

	override onExit() {
		this.editor.getContainer().classList.remove(MAGIC_WAND_INKING_CLASS)
		// Clear the lasso preview hint (the selection happens in `complete`).
		if (this.hintedShapeIds.length) {
			this.editor.setHintingShapes([])
			this.hintedShapeIds = []
		}
		super.onExit()
	}

	override onPointerMove() {
		super.onPointerMove()
		this.updateLassoPreview()
	}

	/**
	 * Previews the gesture's outcome while drawing: tint the ink the selection
	 * colour and outline the shapes that would be lasso-selected on release (the
	 * same blue indicator the brush selection shows), restoring both otherwise.
	 */
	private updateLassoPreview() {
		const inkId = this.initialShape?.id
		if (!inkId) return

		const enclosedShapeIds = this.getEnclosedShapeIds()
		const wouldLasso = enclosedShapeIds.length > 0

		// Tint the in-progress ink.
		if (wouldLasso !== this.inkShowsLassoColor) {
			this.inkShowsLassoColor = wouldLasso
			const color = wouldLasso ? MAGIC_WAND_LASSO_COLOR : this.inkColor
			this.editor.run(
				() => this.editor.updateShape({ id: inkId, type: 'draw', props: { color } }),
				{
					history: 'ignore',
				}
			)
		}

		// Outline the shapes that would be selected.
		if (!areArraysShallowEqual(enclosedShapeIds, this.hintedShapeIds)) {
			this.hintedShapeIds = enclosedShapeIds
			this.editor.setHintingShapes(enclosedShapeIds)
		}
	}

	override complete() {
		const enclosedShapeIds = this.getEnclosedShapeIds()
		if (enclosedShapeIds.length > 0) {
			// Lasso gesture: discard the stroke, select the encircled shapes, and
			// fade out the ink (already the selection colour from the live preview).
			const inkSnapshot = this.initialShape
				? this.editor.getShape<TLDrawShape>(this.initialShape.id)
				: undefined
			if (this.markId) this.editor.bailToMark(this.markId)
			this.editor.setSelectedShapes(enclosedShapeIds)
			this.editor.setCurrentTool('select')
			if (inkSnapshot) fadeOutLassoInk(this.editor, inkSnapshot)
			return
		}

		// Draw gesture: keep the stroke and dry the ink to solid.
		const inkId = this.initialShape?.id
		super.complete()
		if (inkId) dryMagicWandInk(this.editor, inkId)
	}

	/**
	 * Returns the ids of pre-existing top-level shapes encircled by the stroke,
	 * or an empty array if the stroke isn't a closed loop around anything.
	 */
	private getEnclosedShapeIds(): TLShapeId[] {
		const { initialShape } = this
		if (!initialShape) return []

		const strokeShape = this.editor.getShape<TLDrawShape>(initialShape.id)
		// Only treat closed strokes as lasso gestures. The draw tool computes
		// `isClosed` when the stroke's endpoints come back near its start.
		if (!strokeShape || !strokeShape.props.isClosed) return []

		const transform = this.editor.getShapePageTransform(strokeShape.id)
		if (!transform) return []

		// Build the lasso polygon from the stroke's points in page space.
		const polygon: Vec[] = []
		for (const segment of strokeShape.props.segments) {
			for (const point of b64Vecs.decodePoints(segment.path)) {
				polygon.push(Mat.applyToPoint(transform, point))
			}
		}
		if (polygon.length < 3) return []

		const currentPageId = this.editor.getCurrentPageId()
		const enclosedShapeIds: TLShapeId[] = []

		for (const id of this.shapeIdsBeforeGesture) {
			const shape = this.editor.getShape(id)
			if (!shape) continue
			// Only select top-level shapes, and skip anything locked.
			if (shape.parentId !== currentPageId) continue
			if (this.editor.isShapeOrAncestorLocked(shape)) continue

			const bounds = this.editor.getShapePageBounds(id)
			if (!bounds) continue

			if (pointInPolygon(bounds.center, polygon)) {
				enclosedShapeIds.push(id)
			}
		}

		return enclosedShapeIds
	}
}
