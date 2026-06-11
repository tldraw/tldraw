import {
	createShapeId,
	StateNode,
	startEditingShapeWithRichText,
	TLArrowBinding,
	TLArrowShape,
	TLGeoShape,
	TLShapeId,
	TLTextShape,
	toRichText,
} from 'tldraw'

// A pen that draws one annotation: a rectangle around the area to change, an arrow
// pointing at it, and an instantly-editable note at the other end. The three are
// real tldraw shapes (geo + arrow + text) bound and grouped together, so they
// move and delete as one unit and are read by the existing re-render pipeline
// (see collectAnnotations in assetActions.ts) with no special casing.

// Smallest drag that counts as a deliberate rectangle. A click below this gets a
// default-sized rectangle centred on the pointer instead.
const MIN_BOX = 12
const DEFAULT_BOX_W = 140
const DEFAULT_BOX_H = 100
// Gap between the rectangle and its note, and the note's starting width.
const NOTE_GAP = 56
const NOTE_WIDTH = 220
// Annotation styling — red reads as a mark-up over any background.
const ANNOTATION_COLOR = 'red'

export const ANNOTATION_TOOL_ID = 'annotation'

export class AnnotationTool extends StateNode {
	static override id = ANNOTATION_TOOL_ID

	/** The rectangle being dragged out, while the pointer is down. */
	private boxId: TLShapeId | null = null

	override onEnter() {
		this.boxId = null
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown() {
		const { editor } = this
		const origin = editor.inputs.getOriginPagePoint()
		const boxId = createShapeId()
		this.boxId = boxId
		editor.markHistoryStoppingPoint('creating annotation')
		editor.createShape<TLGeoShape>({
			id: boxId,
			type: 'geo',
			x: origin.x,
			y: origin.y,
			props: {
				geo: 'rectangle',
				w: 1,
				h: 1,
				fill: 'none',
				color: ANNOTATION_COLOR,
				dash: 'draw',
			},
		})
	}

	override onPointerMove() {
		const { editor, boxId } = this
		if (!boxId) return
		const origin = editor.inputs.getOriginPagePoint()
		const current = editor.inputs.getCurrentPagePoint()
		editor.updateShape<TLGeoShape>({
			id: boxId,
			type: 'geo',
			x: Math.min(origin.x, current.x),
			y: Math.min(origin.y, current.y),
			props: {
				w: Math.max(1, Math.abs(current.x - origin.x)),
				h: Math.max(1, Math.abs(current.y - origin.y)),
			},
		})
	}

	override onPointerUp() {
		this.complete()
	}

	// Bail out cleanly if the gesture is cancelled or interrupted mid-drag.
	override onCancel() {
		this.cancel()
	}
	override onInterrupt() {
		this.cancel()
	}

	private cancel() {
		const { editor, boxId } = this
		this.boxId = null
		if (boxId) editor.deleteShape(boxId)
		this.editor.setCurrentTool('select')
	}

	/** Finish the annotation: size the rectangle, add the arrow + note, start typing. */
	private complete() {
		const { editor } = this
		const boxId = this.boxId
		this.boxId = null
		if (!boxId) return

		// A click (or a tiny drag) gets a sensible default rectangle around the point.
		let bounds = editor.getShapePageBounds(boxId)
		if (!bounds || bounds.width < MIN_BOX || bounds.height < MIN_BOX) {
			const origin = editor.inputs.getOriginPagePoint()
			editor.updateShape<TLGeoShape>({
				id: boxId,
				type: 'geo',
				x: origin.x - DEFAULT_BOX_W / 2,
				y: origin.y - DEFAULT_BOX_H / 2,
				props: { w: DEFAULT_BOX_W, h: DEFAULT_BOX_H },
			})
			bounds = editor.getShapePageBounds(boxId)!
		}

		// The note sits in the margin to the right of the rectangle, vertically centred.
		const noteId = createShapeId()
		editor.createShape<TLTextShape>({
			id: noteId,
			type: 'text',
			x: bounds.maxX + NOTE_GAP,
			y: bounds.midY,
			props: {
				richText: toRichText(''),
				color: ANNOTATION_COLOR,
				w: NOTE_WIDTH,
				autoSize: true,
			},
		})

		// An arrow from the note to the rectangle, bound at both ends so it keeps
		// pointing at the rectangle and trailing from the note when either moves.
		const arrowId = createShapeId()
		editor.createShape<TLArrowShape>({
			id: arrowId,
			type: 'arrow',
			props: { color: ANNOTATION_COLOR },
		})
		editor.createBindings<TLArrowBinding>([
			{
				fromId: arrowId,
				toId: noteId,
				type: 'arrow',
				props: {
					terminal: 'start',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
					snap: 'none',
				},
			},
			{
				fromId: arrowId,
				toId: boxId,
				type: 'arrow',
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
					snap: 'none',
				},
			},
		])

		// Bundle the three shapes so the annotation behaves as one unit.
		editor.groupShapes([boxId, noteId, arrowId])

		// Drop straight into the note so the user can type the change immediately.
		startEditingShapeWithRichText(editor, noteId)
	}
}
