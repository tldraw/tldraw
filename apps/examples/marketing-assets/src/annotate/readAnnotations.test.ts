import {
	createShapeId,
	Editor,
	TLArrowBinding,
	TLArrowShape,
	TLGeoShape,
	TLShapeId,
	TLTextShape,
	toRichText,
} from 'tldraw'
import { beforeEach, describe, expect, it } from 'vitest'
import { makeEditor } from '../test/makeEditor'
import { deleteAnnotations, readAnnotations } from './readAnnotations'

const FRAME = { x: 0, y: 0, w: 1000, h: 1000 }

let editor: Editor
let frameId: TLShapeId

beforeEach(() => {
	editor = makeEditor()
	frameId = createShapeId()
	editor.createShape<TLGeoShape>({
		id: frameId,
		type: 'geo',
		x: FRAME.x,
		y: FRAME.y,
		props: { geo: 'rectangle', w: FRAME.w, h: FRAME.h },
	})
})

/** A box in page space. */
interface Rect {
	x: number
	y: number
	w: number
	h: number
}

/**
 * Build the annotate tool's triple: a rectangle ringing `area`, a text note placed at
 * `notePos`, and an arrow bound from the note (start) to the rectangle (end), grouped.
 */
function createTriple(opts: { area: Rect; text: string; notePos: { x: number; y: number } }): {
	rectId: TLShapeId
	arrowId: TLShapeId
	noteId: TLShapeId
	groupId: TLShapeId
} {
	const rectId = createShapeId()
	const arrowId = createShapeId()
	const noteId = createShapeId()

	editor.createShape<TLGeoShape>({
		id: rectId,
		type: 'geo',
		x: opts.area.x,
		y: opts.area.y,
		props: { geo: 'rectangle', w: opts.area.w, h: opts.area.h, fill: 'none' },
	})
	editor.createShape<TLTextShape>({
		id: noteId,
		type: 'text',
		x: opts.notePos.x,
		y: opts.notePos.y,
		props: { richText: toRichText(opts.text) },
	})
	editor.createShape<TLArrowShape>({ id: arrowId, type: 'arrow' })
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
			toId: rectId,
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
	editor.groupShapes([rectId, noteId, arrowId])
	const groupId = editor.getShape(rectId)!.parentId as TLShapeId
	return { rectId, arrowId, noteId, groupId }
}

describe('readAnnotations', () => {
	it('reads a tool triple as one annotation with the note text and the ringed area', () => {
		const { rectId, arrowId, noteId } = createTriple({
			area: { x: 100, y: 100, w: 200, h: 200 },
			text: 'make the logo bigger',
			notePos: { x: 500, y: 150 },
		})

		const result = readAnnotations(editor, frameId)

		expect(result).toHaveLength(1)
		expect(result[0].text).toBe('make the logo bigger')
		// area normalized to the frame: rect at (100,100) 200x200 in a 1000x1000 frame.
		expect(result[0].area).toEqual({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 })
		expect(result[0].shapeIds).toEqual(expect.arrayContaining([rectId, arrowId, noteId]))
	})

	it('captures a margin note whose box sits outside the frame (ADR-0005 gap)', () => {
		// The note is far to the right of the frame; only the arrow binding ties it to
		// the ringed area. Overlap alone would drop its text.
		const { noteId } = createTriple({
			area: { x: 700, y: 100, w: 150, h: 150 },
			text: 'change this corner',
			notePos: { x: 1400, y: 150 },
		})

		const result = readAnnotations(editor, frameId)

		expect(result).toHaveLength(1)
		expect(result[0].text).toBe('change this corner')
		expect(result[0].shapeIds).toContain(noteId)
	})

	it('pairs the text shape as the note, not the text-less rectangle', () => {
		const { rectId, noteId } = createTriple({
			area: { x: 200, y: 200, w: 100, h: 100 },
			text: 'the actual instruction',
			notePos: { x: 600, y: 220 },
		})

		const [annotation] = readAnnotations(editor, frameId)

		// The note's text must survive; the rectangle must be the area, not swallow the note.
		expect(annotation.text).toBe('the actual instruction')
		expect(annotation.shapeIds).toContain(rectId)
		expect(annotation.shapeIds).toContain(noteId)
	})

	it('reads two triples as two annotations sharing no shapes', () => {
		const a = createTriple({
			area: { x: 50, y: 50, w: 100, h: 100 },
			text: 'first',
			notePos: { x: 300, y: 60 },
		})
		const b = createTriple({
			area: { x: 600, y: 600, w: 100, h: 100 },
			text: 'second',
			notePos: { x: 850, y: 610 },
		})

		const result = readAnnotations(editor, frameId)

		expect(result).toHaveLength(2)
		expect(result.map((r) => r.text).sort()).toEqual(['first', 'second'])
		// Exclusivity: every shape belongs to at most one annotation.
		const all = result.flatMap((r) => r.shapeIds)
		expect(new Set(all).size).toBe(all.length)
		const aShapes = new Set([a.rectId, a.arrowId, a.noteId])
		const bShapes = new Set([b.rectId, b.arrowId, b.noteId])
		for (const r of result) {
			const inA = r.shapeIds.some((id) => aShapes.has(id))
			const inB = r.shapeIds.some((id) => bShapes.has(id))
			expect(inA).not.toBe(inB)
		}
	})

	it('ignores annotations that do not reach the frame', () => {
		createTriple({
			area: { x: 5000, y: 5000, w: 100, h: 100 },
			text: 'far away',
			notePos: { x: 5300, y: 5010 },
		})

		expect(readAnnotations(editor, frameId)).toHaveLength(0)
	})

	it('returns nothing for a frame with no annotations', () => {
		expect(readAnnotations(editor, frameId)).toEqual([])
	})
})

describe('deleteAnnotations', () => {
	it('removes every consumed shape and sweeps the emptied group shell', () => {
		const { rectId, arrowId, noteId, groupId } = createTriple({
			area: { x: 100, y: 100, w: 100, h: 100 },
			text: 'remove me',
			notePos: { x: 400, y: 110 },
		})

		const annotations = readAnnotations(editor, frameId)
		deleteAnnotations(editor, annotations)

		expect(editor.getShape(rectId)).toBeUndefined()
		expect(editor.getShape(arrowId)).toBeUndefined()
		expect(editor.getShape(noteId)).toBeUndefined()
		// The group is now empty and must be gone too — no orphaned shell.
		expect(editor.getShape(groupId)).toBeUndefined()
		// The frame is untouched.
		expect(editor.getShape(frameId)).toBeDefined()
	})

	it('does nothing when given no annotations', () => {
		const before = editor.getCurrentPageShapes().length
		deleteAnnotations(editor, [])
		expect(editor.getCurrentPageShapes().length).toBe(before)
	})
})
