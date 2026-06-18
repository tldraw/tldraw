import {
	Mat,
	TLDefaultColorStyle,
	TLDefaultFillStyle,
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
	MAGIC_WAND_LASSO_COLOR,
	clearWetInk,
	dryWetInk,
	fadeOutLassoInk,
	setWetInk,
} from './magicWandInk'

// Screen-space distance between the gesture's start and end for it to count as a
// closed loop. Only used when the stroke has been split into multiple shapes; a
// single unsplit stroke uses the draw tool's own (zoom-aware) `isClosed` flag.
const MAGIC_WAND_CLOSE_DISTANCE = 16

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

	// The stroke's natural colour and fill, restored when the gesture stops being
	// a lasso.
	private inkColor: TLDefaultColorStyle = 'black'
	private inkFill: TLDefaultFillStyle = 'none'
	// Whether the ink is currently showing the selection (lasso) colour.
	private inkShowsLassoColor = false
	// The shapes currently previewed as "would be selected" (blue hint outline).
	private hintedShapeIds: TLShapeId[] = []
	// The stroke pieces the wet-ink CSS currently covers (the draw tool may split
	// one long stroke into several shapes).
	private wetInkIds: TLShapeId[] = []
	// Whether the stroke is mid "ink drying" fade, so onExit shouldn't clear it.
	private isDryingInk = false

	override onEnter(info: TLPointerEventInfo) {
		this.shapeIdsBeforeGesture = new Set(this.editor.getCurrentPageShapeIds())
		this.inkShowsLassoColor = false
		this.hintedShapeIds = []
		this.wetInkIds = []
		this.isDryingInk = false
		// Enable the CSS colour transition for the in-progress stroke.
		this.editor.getContainer().classList.add(MAGIC_WAND_INKING_CLASS)
		super.onEnter(info)
		// Show the in-progress stroke at half opacity (the "wet ink" look). This is
		// purely a CSS effect — the shape's real opacity is left untouched so it
		// stays correct through undo/redo, cancel, etc.
		const inkShape = this.initialShape && this.editor.getShape<TLDrawShape>(this.initialShape.id)
		if (inkShape) {
			this.inkColor = inkShape.props.color
			this.inkFill = inkShape.props.fill
			this.wetInkIds = [inkShape.id]
			setWetInk(this.editor, this.wetInkIds)
		}
	}

	override onExit() {
		this.editor.getContainer().classList.remove(MAGIC_WAND_INKING_CLASS)
		// Clear the lasso preview hint (the selection happens in `complete`).
		if (this.hintedShapeIds.length) {
			this.editor.setHintingShapes([])
			this.hintedShapeIds = []
		}
		// Drop the wet-ink translucency immediately unless we're mid dry-fade (a
		// normal draw completion), e.g. on cancel, interrupt, or tool switch.
		if (!this.isDryingInk) {
			clearWetInk(this.editor)
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
		const strokeShapes = this.getGestureStrokeShapes()
		if (strokeShapes.length === 0) return
		const strokeIds = strokeShapes.map((s) => s.id)

		const enclosedShapeIds = this.getEnclosedShapeIds()
		const wouldLasso = enclosedShapeIds.length > 0

		// Keep the wet-ink translucency covering every piece of the stroke (the
		// draw tool may have split it), and give any freshly split piece the
		// current lasso colour/fill so the whole stroke stays consistent.
		if (!areArraysShallowEqual(strokeIds, this.wetInkIds)) {
			this.wetInkIds = strokeIds
			setWetInk(this.editor, strokeIds)
			this.applyInkStyle(strokeShapes, this.inkShowsLassoColor)
		}

		// Tint the ink and fill the loop with solid colour so the lasso region
		// reads clearly as a visual aid.
		if (wouldLasso !== this.inkShowsLassoColor) {
			this.inkShowsLassoColor = wouldLasso
			this.applyInkStyle(strokeShapes, wouldLasso)
		}

		// Outline the shapes that would be selected.
		if (!areArraysShallowEqual(enclosedShapeIds, this.hintedShapeIds)) {
			this.hintedShapeIds = enclosedShapeIds
			this.editor.setHintingShapes(enclosedShapeIds)
		}
	}

	/** Sets the colour and fill of every stroke piece for the given lasso state. */
	private applyInkStyle(strokeShapes: TLDrawShape[], lasso: boolean) {
		const color = lasso ? MAGIC_WAND_LASSO_COLOR : this.inkColor
		const fill = lasso ? 'solid' : this.inkFill
		this.editor.run(
			() => {
				for (const shape of strokeShapes) {
					this.editor.updateShape({ id: shape.id, type: 'draw', props: { color, fill } })
				}
			},
			{ history: 'ignore' }
		)
	}

	override complete() {
		const enclosedShapeIds = this.getEnclosedShapeIds()
		if (enclosedShapeIds.length > 0) {
			// Lasso gesture: discard every stroke piece, select the encircled
			// shapes, and fade out a copy of each piece (already the selection
			// colour from the live preview).
			const inkSnapshots = this.getGestureStrokeShapes()
			if (this.markId) this.editor.bailToMark(this.markId)
			this.editor.setSelectedShapes(enclosedShapeIds)
			this.editor.setCurrentTool('select')
			for (const snapshot of inkSnapshots) fadeOutLassoInk(this.editor, snapshot)
			return
		}

		// Draw gesture: keep the stroke and dry the ink (CSS-only) to solid.
		const strokeIds = this.getGestureStrokeShapes().map((s) => s.id)
		if (strokeIds.length) this.isDryingInk = true
		super.complete()
		if (strokeIds.length) dryWetInk(this.editor, strokeIds)
	}

	/**
	 * The draw shapes that make up the current gesture, in drawing order. The
	 * draw tool splits a long stroke into multiple shapes, so a gesture can be
	 * more than one shape.
	 */
	private getGestureStrokeShapes(): TLDrawShape[] {
		return this.editor
			.getCurrentPageShapesSorted()
			.filter((s): s is TLDrawShape => s.type === 'draw' && !this.shapeIdsBeforeGesture.has(s.id))
	}

	/**
	 * Returns the ids of pre-existing top-level shapes encircled by the stroke,
	 * or an empty array if the stroke isn't a closed loop around anything.
	 */
	private getEnclosedShapeIds(): TLShapeId[] {
		const strokeShapes = this.getGestureStrokeShapes()
		if (strokeShapes.length === 0) return []

		// Build the lasso polygon across every piece of the gesture, in drawing
		// order, so a stroke that the draw tool split still forms one loop.
		const polygon: Vec[] = []
		for (const stroke of strokeShapes) {
			const transform = this.editor.getShapePageTransform(stroke.id)
			if (!transform) continue
			for (const segment of stroke.props.segments) {
				for (const point of b64Vecs.decodePoints(segment.path)) {
					polygon.push(Mat.applyToPoint(transform, point))
				}
			}
		}
		if (polygon.length < 3) return []

		// Only treat the stroke as a lasso if it loops back on itself. A single
		// unsplit stroke carries the draw tool's own (zoom-aware) `isClosed` flag;
		// once split, no single piece is closed, so compare the overall endpoints.
		const isClosed =
			strokeShapes.some((s) => s.props.isClosed) ||
			Vec.Dist(polygon[0], polygon[polygon.length - 1]) <
				MAGIC_WAND_CLOSE_DISTANCE / this.editor.getZoomLevel()
		if (!isClosed) return []

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
