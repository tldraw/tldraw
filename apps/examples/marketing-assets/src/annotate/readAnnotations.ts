import {
	Box,
	Editor,
	getArrowBindings,
	getArrowInfo,
	TLArrowShape,
	TLParentId,
	TLShape,
	TLShapeId,
} from 'tldraw'

/**
 * One annotation read off the canvas: a comment and the area it applies to.
 *
 * The annotate tool draws this as a triple — a rectangle ringing the subject, an
 * arrow, and a text note — but a hand-drawn arrow with a nearby note reads the same
 * way. Pure data: it carries no prose. Phrasing it for a model is the caller's job;
 * `shapeIds` lets the caller delete it once consumed (see `deleteAnnotations`).
 */
export interface ReadAnnotation {
	/** The comment: the note tied to the arrow, plus any text on the arrow itself. */
	text: string
	/** The subject area, normalized to 0..1 within the frame. */
	area: { x: number; y: number; w: number; h: number }
	/** Every shape this annotation consumed: the rectangle, arrow, and note. */
	shapeIds: TLShapeId[]
}

// Shape types that can take part in an annotation. Arrows anchor it; the rest can be
// the ringed area or the note.
const ANNOTATION_TYPES = new Set(['arrow', 'text', 'draw', 'geo', 'note', 'line', 'highlight'])

/**
 * Read the annotations pointing at a frame as structured intent.
 *
 * Pure: takes the editor, returns data, mutates nothing — so its interface is its
 * test surface. Each annotation is one arrow paired with the rectangle it points at
 * (its end) and the note it trails from (its start); every shape is consumed by at
 * most one annotation. The binding walk is the primary path — the annotate tool
 * binds note→arrow→rectangle, and a bound arrow leaves a gap to its target, so
 * overlap alone would drop a margin note. Overlap is kept as a fallback for
 * hand-drawn arrows and text.
 */
export function readAnnotations(editor: Editor, frameId: TLShapeId): ReadAnnotation[] {
	const frame = editor.getShapePageBounds(frameId)
	if (!frame) return []

	const candidates = editor
		.getCurrentPageShapes()
		.filter((s) => s.id !== frameId && ANNOTATION_TYPES.has(s.type))

	const bounds = new Map<TLShapeId, Box>()
	for (const s of candidates) {
		const b = editor.getShapePageBounds(s.id)
		if (b) bounds.set(s.id, b)
	}

	// What each arrow binds to: start is where it's drawn from (the note), end is
	// where it points (the rectangle). A hand-drawn arrow may bind to nothing.
	const ends = new Map<TLShapeId, { start?: TLShapeId; end?: TLShapeId }>()
	const arrows: TLArrowShape[] = []
	for (const s of candidates) {
		if (s.type !== 'arrow' || !bounds.has(s.id)) continue
		const arrow = s as TLArrowShape
		arrows.push(arrow)
		const b = getArrowBindings(editor, arrow)
		ends.set(arrow.id, { start: b.start?.toId, end: b.end?.toId })
	}

	// Arrows belonging to this frame: their own box overlaps it, or a shape they bind
	// to does (e.g. a rectangle drawn on the asset).
	const onFrame = (id?: TLShapeId) => !!id && bounds.has(id) && overlaps(frame, bounds.get(id)!)
	const frameArrows = arrows.filter((a) => {
		if (overlaps(frame, bounds.get(a.id)!)) return true
		const e = ends.get(a.id)!
		return onFrame(e.start) || onFrame(e.end)
	})

	const used = new Set<TLShapeId>()
	const annotations: ReadAnnotation[] = []

	for (const arrow of frameArrows) {
		const e = ends.get(arrow.id)!
		const arrowBox = bounds.get(arrow.id)!

		// Shapes linked to this arrow: bound at either end, or overlapping it (the
		// hand-drawn fallback). Restricted to ones not already used by another
		// annotation, keeping each note and rectangle exclusive to one.
		const linked = candidates.filter(
			(s) =>
				s.type !== 'arrow' &&
				bounds.has(s.id) &&
				(s.id === e.start || s.id === e.end || overlaps(arrowBox, bounds.get(s.id)!))
		)

		// The note trails from the arrow's start; prefer a shape that carries text so
		// the text-less rectangle is never paired as the note and swallow it.
		const note =
			take(linked, used, (s) => s.id === e.start && !!getText(editor, s)) ??
			take(linked, used, (s) => !!getText(editor, s))

		// The area is what the arrow points at — its end — else any other linked
		// shape, else a zero-size box at the resolved arrow head.
		const areaShape = take(linked, used, (s) => s.id === e.end) ?? take(linked, used, () => true)
		const areaBox = (areaShape && bounds.get(areaShape.id)) ?? headBox(editor, arrow)
		if (!areaBox) continue

		const shapeIds = [arrow.id, areaShape?.id, note?.id].filter(Boolean) as TLShapeId[]
		const text = [getText(editor, arrow), note ? getText(editor, note) : '']
			.filter(Boolean)
			.join(' — ')

		annotations.push({ text, area: normalize(areaBox, frame), shapeIds })
	}

	return annotations
}

/**
 * Delete annotations once they've been consumed. Removes every shape each one used,
 * then sweeps any annotation group left empty by the deletion, so no orphaned group
 * shell remains.
 */
export function deleteAnnotations(editor: Editor, annotations: ReadAnnotation[]): void {
	const shapeIds = annotations.flatMap((a) => a.shapeIds)
	if (shapeIds.length === 0) return

	// The annotate tool groups its three shapes. Note the group parents before
	// deleting the children so we can remove any that the deletion leaves empty.
	const groups = new Set<TLShapeId>()
	for (const id of shapeIds) {
		const parent = editor.getShape(id)?.parentId
		if (parent && isGroup(editor, parent)) groups.add(parent)
	}

	editor.deleteShapes(shapeIds)

	const empty = [...groups].filter((g) => editor.getSortedChildIdsForParent(g).length === 0)
	if (empty.length) editor.deleteShapes(empty)
}

/** Find the first unused shape matching `pred`, mark it used, and return it. */
function take(
	list: TLShape[],
	used: Set<TLShapeId>,
	pred: (s: TLShape) => boolean
): TLShape | undefined {
	const found = list.find((s) => !used.has(s.id) && pred(s))
	if (found) used.add(found.id)
	return found
}

function getText(editor: Editor, shape: TLShape): string {
	const util = editor.getShapeUtil(shape) as { getText?(s: TLShape): string | undefined }
	const text = util.getText?.(shape)
	return typeof text === 'string' ? text.trim() : ''
}

/** A zero-size box at the page-space point an arrow's head lands on. */
function headBox(editor: Editor, arrow: TLArrowShape): Box | undefined {
	const transform = editor.getShapePageTransform(arrow)
	if (!transform) return undefined
	// For a bound arrow the live head comes from the binding; props.end is a stale
	// fallback, so prefer the computed info.
	const info = getArrowInfo(editor, arrow)
	const end = info ? info.end.point : arrow.props.end
	const p = transform.applyToPoint(end)
	return new Box(p.x, p.y, 0, 0)
}

/** Express a page-space box as a fraction of the frame's bounds. */
function normalize(box: Box, frame: Box) {
	return {
		x: (box.minX - frame.minX) / frame.width,
		y: (box.minY - frame.minY) / frame.height,
		w: box.width / frame.width,
		h: box.height / frame.height,
	}
}

function isGroup(editor: Editor, parent: TLParentId): parent is TLShapeId {
	return editor.getShape(parent as TLShapeId)?.type === 'group'
}

function overlaps(a: Box, b: Box): boolean {
	return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY
}
