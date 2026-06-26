import {
	Mat,
	TLDefaultColorStyle,
	TLDefaultFillStyle,
	TLDrawShape,
	TLGeoShape,
	TLPointerEventInfo,
	TLShapeId,
	Vec,
	areArraysShallowEqual,
	createShapeId,
	pointInPolygon,
} from '@tldraw/editor'
import { getPointsFromDrawSegments } from '../../shapes/draw/getPath'
import { Drawing } from '../../shapes/draw/toolStates/Drawing'
import {
	MAGIC_WAND_INKING_CLASS,
	MAGIC_WAND_LASSO_COLOR,
	clearWetInk,
	dryWetInk,
	fadeInShape,
	fadeOutInkGhost,
	removeMorphPreview,
	setWetInk,
	showMorphPreview,
} from './magicWandInk'
import { MorphTuningInfo } from './MagicWandMorphTuning'
import {
	ShapeRecognitionResult,
	buildRecognizerInput,
	recognizeShape,
	rectangleTopLeft,
} from './shapeRecognition'

// Screen-space distance between the gesture's start and end for it to count as a
// closed loop. Only used when the stroke has been split into multiple shapes; a
// single unsplit stroke uses the draw tool's own (zoom-aware) `isClosed` flag.
const MAGIC_WAND_CLOSE_DISTANCE = 16

/** How long the pen must be held roughly still to morph the sketch into a shape. */
const MORPH_HOLD_MS = 1000
/** Delay before the "charging" morph preview appears (so a brief pause doesn't flash it). */
const MORPH_PREVIEW_DELAY_MS = 200
/** Screen-space movement that resets the hold-to-morph timer ("held there"). */
const MORPH_MOVE_TOLERANCE = 6

type RecognizedRectangle = Extract<ShapeRecognitionResult, { kind: 'rectangle' }>

/**
 * The drawing state for the magic wand tool. It behaves like the regular draw
 * tool while the stroke is in progress, but on completion it checks whether the
 * stroke forms a closed loop around existing shapes. If it does, the stroke is
 * discarded and the encircled shapes are selected instead (a lasso gesture).
 *
 * While drawing, the ink previews the outcome: it turns the selection colour
 * whenever releasing at the current point would lasso-select something.
 *
 * It also recognizes shapes: holding the pen roughly still for ~1s while the
 * sketch is approximately a rectangle morphs it into a real geo rectangle.
 */
export class MagicWandDrawing extends Drawing {
	// Shapes that existed before this stroke started, so we never try to lasso
	// the stroke shape(s) created during the gesture.
	private shapeIdsBeforeGesture = new Set<TLShapeId>()

	// Hold-to-morph state. We count time since the last significant move; holding
	// still for MORPH_HOLD_MS with a recognized shape triggers the morph.
	private morphAnchorPagePoint: Vec | null = null
	private morphTimeout: number | null = null
	private previewTimeout: number | null = null
	private morphPreviewId: TLShapeId | null = null
	private morphRecognition: RecognizedRectangle | null = null
	private didMorph = false

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
		this.didMorph = false
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
		this.armMorphTimers()
	}

	override onExit() {
		this.editor.getContainer().classList.remove(MAGIC_WAND_INKING_CLASS)
		this.clearMorphTimers()
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
		// Reset the hold-to-morph clock whenever the pen moves meaningfully, so the
		// morph only fires after the pen has been held roughly still.
		if (this.didMorph) return
		const point = this.editor.inputs.getCurrentPagePoint()
		const tolerance = MORPH_MOVE_TOLERANCE / this.editor.getZoomLevel()
		if (!this.morphAnchorPagePoint || Vec.Dist(point, this.morphAnchorPagePoint) > tolerance) {
			this.armMorphTimers()
		}
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
		// When the morph charging preview is showing, morph will win over lasso on
		// hold — suppress the lasso tint so only the morph signal is visible.
		const wouldLasso = enclosedShapeIds.length > 0 && !this.morphPreviewId

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
		if (this.didMorph) return
		this.clearMorphTimers()
		const enclosedShapeIds = this.getEnclosedShapeIds()
		if (enclosedShapeIds.length > 0) {
			// Lasso gesture: discard every stroke piece, select the encircled
			// shapes, and fade out a copy of each piece (already the selection
			// colour from the live preview).
			const inkSnapshots = this.getGestureStrokeShapes()
			if (this.markId) this.editor.bailToMark(this.markId)
			this.editor.setSelectedShapes(enclosedShapeIds)
			this.editor.setCurrentTool('select')
			for (const snapshot of inkSnapshots) {
				fadeOutInkGhost(this.editor, snapshot, MAGIC_WAND_LASSO_COLOR)
			}
			return
		}

		// Draw gesture: keep the stroke and dry the ink (CSS-only) to solid.
		const strokeIds = this.getGestureStrokeShapes().map((s) => s.id)
		if (strokeIds.length) this.isDryingInk = true
		super.complete()
		if (strokeIds.length) dryWetInk(this.editor, strokeIds)
	}

	// --- Hold-to-morph -------------------------------------------------------

	/** (Re)starts the hold timers from the current pen position. */
	private armMorphTimers() {
		this.clearMorphTimers()
		this.morphAnchorPagePoint = this.editor.inputs.getCurrentPagePoint().clone()
		this.previewTimeout = this.editor.timers.setTimeout(
			() => this.previewMorph(),
			MORPH_PREVIEW_DELAY_MS
		)
		this.morphTimeout = this.editor.timers.setTimeout(() => this.tryMorph(), MORPH_HOLD_MS)
	}

	/** Cancels both hold timers and removes any visible morph preview. */
	private clearMorphTimers() {
		if (this.previewTimeout !== null) {
			clearTimeout(this.previewTimeout)
			this.previewTimeout = null
		}
		if (this.morphTimeout !== null) {
			clearTimeout(this.morphTimeout)
			this.morphTimeout = null
		}
		this.morphRecognition = null
		this.clearMorphPreview()
	}

	private clearMorphPreview() {
		if (this.morphPreviewId) {
			removeMorphPreview(this.editor, this.morphPreviewId)
			this.morphPreviewId = null
		}
	}

	/** The recognized rectangle for the current stroke, or null. */
	private getMorphRectangle(): RecognizedRectangle | null {
		const input = buildRecognizerInput(this.getGesturePolygon())
		if (!input) return null
		const result = recognizeShape(input)
		return result && result.kind === 'rectangle' ? result : null
	}

	/** After a short pause, show the "charging" preview if the stroke is a rectangle. */
	private previewMorph() {
		this.previewTimeout = null
		if (this.didMorph) return
		const rect = this.getMorphRectangle()
		if (!rect) return
		this.morphRecognition = rect
		const topLeft = rectangleTopLeft(rect)
		this.morphPreviewId = showMorphPreview(
			this.editor,
			{
				x: topLeft.x,
				y: topLeft.y,
				w: rect.w,
				h: rect.h,
				rotation: rect.rotation,
				color: MAGIC_WAND_LASSO_COLOR,
			},
			MORPH_HOLD_MS - MORPH_PREVIEW_DELAY_MS
		)
	}

	/** Fires after the hold; replaces the sketch with the recognized rectangle. */
	private tryMorph() {
		this.morphTimeout = null
		if (this.didMorph) return

		const rect = this.morphRecognition ?? this.getMorphRectangle()
		const strokeShapes = this.getGestureStrokeShapes()
		if (!rect || strokeShapes.length === 0) return

		this.didMorph = true
		this.clearMorphTimers()

		const dash = strokeShapes[0].props.dash
		const size = strokeShapes[0].props.size
		const scale = strokeShapes[0].props.scale

		// Discard the freehand stroke, then create the rectangle as one recorded
		// step (mirrors the lasso): net undo = "create rectangle".
		if (this.markId) this.editor.bailToMark(this.markId)

		// Mark before createShape so the morph-tuning state can bail here on cancel.
		const morphMark = this.editor.markHistoryStoppingPoint('morph-create')

		const id = createShapeId()
		const topLeft = rectangleTopLeft(rect)
		this.editor.createShape<TLGeoShape>({
			id,
			type: 'geo',
			x: topLeft.x,
			y: topLeft.y,
			rotation: rect.rotation,
			props: {
				geo: 'rectangle',
				w: rect.w,
				h: rect.h,
				color: this.inkColor,
				fill: this.inkFill,
				dash,
				size,
				scale,
			},
		})

		// Crossfade: fade the new rectangle in while ghost copies of the sketch
		// fade out.
		fadeInShape(this.editor, id)
		for (const snapshot of strokeShapes) fadeOutInkGhost(this.editor, snapshot)

		this.editor.setSelectedShapes([id])

		// While the pointer is still held, enter the drag-to-tune state so the
		// user can pull a corner to adjust scale and rotation.
		const transform = this.editor.getShapePageTransform(id)
		if (transform) {
			const localCorners = [
				new Vec(0, 0),
				new Vec(rect.w, 0),
				new Vec(rect.w, rect.h),
				new Vec(0, rect.h),
			]
			const pageCorners = localCorners.map((c) => Mat.applyToPoint(transform, c))
			const pointer = this.editor.inputs.getCurrentPagePoint()
			let nearestIdx = 0
			for (let i = 1; i < 4; i++) {
				if (Vec.Dist(pageCorners[i], pointer) < Vec.Dist(pageCorners[nearestIdx], pointer)) {
					nearestIdx = i
				}
			}
			const anchorIdx = (nearestIdx + 2) % 4
			const anchor = pageCorners[anchorIdx]
			const localDiag = Vec.Sub(localCorners[nearestIdx], localCorners[anchorIdx])
			const tuningInfo: MorphTuningInfo = {
				shapeId: id,
				anchorPagePos: anchor,
				localAspectAngle: Math.atan2(localDiag.y, localDiag.x),
				originalW: rect.w,
				originalH: rect.h,
				originalDiagLen: localDiag.len(),
				morphMark,
			}
			this.parent.transition('morph-tuning', tuningInfo)
		} else {
			this.parent.transition('idle')
		}
	}

	/** The current gesture's page-space polygon across all stroke pieces. */
	private getGesturePolygon(): Vec[] {
		const polygon: Vec[] = []
		for (const stroke of this.getGestureStrokeShapes()) {
			const transform = this.editor.getShapePageTransform(stroke.id)
			if (!transform) continue
			const points = getPointsFromDrawSegments(
				stroke.props.segments,
				stroke.props.scaleX,
				stroke.props.scaleY
			)
			for (const point of points) {
				polygon.push(Mat.applyToPoint(transform, point))
			}
		}
		return polygon
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

		// The lasso polygon across every piece of the gesture (the draw tool may
		// split one stroke into several shapes).
		const polygon = this.getGesturePolygon()
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
