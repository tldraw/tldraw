import type { TLCommentAnchor, TLShapeId } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { createFakeEditor } from './test-editor'
import { commentTargetShape, resolveCommentDrop } from './thread-state'

const A = 'shape:a' as TLShapeId
const B = 'shape:b' as TLShapeId

/** The default outline margin is 8 screen px, so at zoom 1 anything within 8 units counts as ink. */
const INSIDE_MARGIN = 3
const OUTSIDE_MARGIN = 40

function shapeAnchor(shapeId: TLShapeId, x = 0.5, y = 0.5): TLCommentAnchor {
	return { type: 'shape', shapeId, x, y, isPrecise: true }
}

describe('commentTargetShape', () => {
	it('attaches on a stroke', () => {
		const editor = createFakeEditor({
			shapes: [{ id: A, w: 200, h: 100, distanceToOutline: INSIDE_MARGIN }],
		})
		expect(commentTargetShape(editor, { x: 0, y: 50 })?.id).toBe(A)
	})

	it('ignores blank space away from the stroke', () => {
		const editor = createFakeEditor({
			shapes: [{ id: A, w: 200, h: 100, distanceToOutline: OUTSIDE_MARGIN }],
		})
		expect(commentTargetShape(editor, { x: 100, y: 50 })).toBeUndefined()
	})

	// The reason this isn't `getShapeAtPoint({ hitInside: false })`: a filled shape reports interior
	// points as a negative distance, so that call returns the shape and swallows the whole fill.
	it('ignores the inside of a filled shape, where the distance comes back negative', () => {
		const editor = createFakeEditor({
			shapes: [{ id: A, w: 200, h: 100, distanceToOutline: -OUTSIDE_MARGIN }],
		})
		expect(commentTargetShape(editor, { x: 100, y: 50 })).toBeUndefined()
	})

	it('still attaches just inside the stroke of a filled shape', () => {
		const editor = createFakeEditor({
			shapes: [{ id: A, w: 200, h: 100, distanceToOutline: -INSIDE_MARGIN }],
		})
		expect(commentTargetShape(editor, { x: 2, y: 50 })?.id).toBe(A)
	})

	it('takes the top-most shape whose stroke is under the point', () => {
		const editor = createFakeEditor({
			shapes: [
				{ id: A, w: 200, h: 100, distanceToOutline: OUTSIDE_MARGIN },
				{ id: B, w: 200, h: 100, distanceToOutline: INSIDE_MARGIN },
			],
		})
		// A is on top but the point isn't on its stroke, so the hit falls through to B.
		expect(commentTargetShape(editor, { x: 0, y: 50 })?.id).toBe(B)
	})

	it('scales the margin by zoom, so the stroke is equally reachable when zoomed out', () => {
		// 12 page units is outside the 8px margin at zoom 1, but inside it at zoom 0.5 (16 units).
		const shapes = [{ id: A, w: 200, h: 100, distanceToOutline: 12 }]
		expect(
			commentTargetShape(createFakeEditor({ shapes, zoom: 1 }), { x: 0, y: 0 })
		).toBeUndefined()
		expect(commentTargetShape(createFakeEditor({ shapes, zoom: 0.5 }), { x: 0, y: 0 })?.id).toBe(A)
	})

	describe('shapes with no stroke to aim at', () => {
		it('attaches anywhere on an image', () => {
			const editor = createFakeEditor({
				shapes: [{ id: A, type: 'image', w: 200, h: 100, distanceToOutline: OUTSIDE_MARGIN }],
			})
			expect(commentTargetShape(editor, { x: 100, y: 50 })?.id).toBe(A)
		})

		it('attaches anywhere on text and notes', () => {
			for (const type of ['text', 'note', 'video', 'bookmark', 'embed']) {
				const editor = createFakeEditor({
					shapes: [{ id: A, type, w: 200, h: 100, distanceToOutline: OUTSIDE_MARGIN }],
				})
				expect(commentTargetShape(editor, { x: 100, y: 50 })?.id).toBe(A)
			}
		})

		it('does not exempt frames, so a comment inside one is not bound to the frame', () => {
			const editor = createFakeEditor({
				shapes: [{ id: A, type: 'frame', w: 400, h: 400, distanceToOutline: OUTSIDE_MARGIN }],
			})
			expect(commentTargetShape(editor, { x: 200, y: 200 })).toBeUndefined()
		})
	})
})

describe('resolveCommentDrop', () => {
	describe('normal drag', () => {
		it('attaches to the stroke under the point and highlights it', () => {
			const editor = createFakeEditor({
				shapes: [{ id: A, w: 200, h: 100, distanceToOutline: INSIDE_MARGIN }],
			})
			expect(resolveCommentDrop(editor, { x: 50, y: 0 })).toEqual({
				anchor: { type: 'shape', shapeId: A, x: 0.25, y: 0, isPrecise: true },
				highlightShapeId: A,
			})
		})

		it('always stores a precise anchor, so the pin stays where it was put', () => {
			const editor = createFakeEditor({
				shapes: [{ id: A, w: 200, h: 100, distanceToOutline: INSIDE_MARGIN }],
			})
			const { anchor } = resolveCommentDrop(editor, { x: 150, y: 75 })
			expect(anchor).toMatchObject({ isPrecise: true, x: 0.75, y: 0.75 })
		})

		it('leaves the comment a free point on blank canvas, with nothing highlighted', () => {
			const editor = createFakeEditor({ shapes: [] })
			expect(resolveCommentDrop(editor, { x: 12, y: 34 })).toEqual({
				anchor: { type: 'point', x: 12, y: 34 },
				highlightShapeId: null,
			})
		})

		// This is how a comment detaches: there is no modifier for it, you drag it off the ink.
		it('detaches an attached comment dragged onto blank space', () => {
			const editor = createFakeEditor({
				shapes: [{ id: A, w: 200, h: 100, distanceToOutline: OUTSIDE_MARGIN }],
			})
			expect(resolveCommentDrop(editor, { x: 100, y: 50 }, { current: shapeAnchor(A) })).toEqual({
				anchor: { type: 'point', x: 100, y: 50 },
				highlightShapeId: null,
			})
		})
	})

	describe('constrained drag (Alt)', () => {
		it('keeps the comment on its shape even over the fill, where a normal drag would detach', () => {
			const editor = createFakeEditor({
				shapes: [{ id: A, w: 200, h: 100, distanceToOutline: OUTSIDE_MARGIN }],
			})
			expect(
				resolveCommentDrop(editor, { x: 100, y: 50 }, { current: shapeAnchor(A), constrain: true })
			).toEqual({
				anchor: { type: 'shape', shapeId: A, x: 0.5, y: 0.5, isPrecise: true },
				highlightShapeId: A,
			})
		})

		it('clamps to the shape’s box rather than following the pointer out of it', () => {
			const editor = createFakeEditor({
				shapes: [{ id: A, w: 200, h: 100, distanceToOutline: OUTSIDE_MARGIN }],
			})
			const { anchor } = resolveCommentDrop(
				editor,
				{ x: 900, y: -500 },
				{ current: shapeAnchor(A), constrain: true }
			)
			expect(anchor).toEqual({ type: 'shape', shapeId: A, x: 1, y: 0, isPrecise: true })
		})

		it('ignores a shape sitting on top, because the bound shape is what matters', () => {
			const editor = createFakeEditor({
				shapes: [
					{ id: B, w: 200, h: 100, distanceToOutline: INSIDE_MARGIN },
					{ id: A, w: 200, h: 100, distanceToOutline: OUTSIDE_MARGIN },
				],
			})
			const { anchor, highlightShapeId } = resolveCommentDrop(
				editor,
				{ x: 50, y: 50 },
				{ current: shapeAnchor(A), constrain: true }
			)
			expect(highlightShapeId).toBe(A)
			expect(anchor).toMatchObject({ type: 'shape', shapeId: A })
		})

		it('falls back to a normal drag for a comment that is not attached to anything', () => {
			const editor = createFakeEditor({
				shapes: [{ id: A, w: 200, h: 100, distanceToOutline: INSIDE_MARGIN }],
			})
			const current: TLCommentAnchor = { type: 'point', x: 0, y: 0 }
			expect(resolveCommentDrop(editor, { x: 50, y: 0 }, { current, constrain: true })).toEqual({
				anchor: { type: 'shape', shapeId: A, x: 0.25, y: 0, isPrecise: true },
				highlightShapeId: A,
			})
		})

		it('falls back to a normal drag when the bound shape has been deleted', () => {
			const editor = createFakeEditor({ shapes: [] })
			expect(
				resolveCommentDrop(editor, { x: 7, y: 9 }, { current: shapeAnchor(A), constrain: true })
			).toEqual({
				anchor: { type: 'point', x: 7, y: 9 },
				highlightShapeId: null,
			})
		})
	})

	it('resolves the highlight and the anchor together, so they cannot disagree', () => {
		const editor = createFakeEditor({
			shapes: [{ id: A, w: 200, h: 100, distanceToOutline: INSIDE_MARGIN }],
		})
		const { anchor, highlightShapeId } = resolveCommentDrop(editor, { x: 50, y: 0 })
		expect(anchor.type === 'shape' && anchor.shapeId).toBe(highlightShapeId)
	})
})
