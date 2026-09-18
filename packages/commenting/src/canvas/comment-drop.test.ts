import type { TLCommentAnchor, TLShapeId } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { createFakeEditor } from './test-editor'
import { commentTargetShape, resolveCommentDrop } from './thread-state'

const A = 'shape:a' as TLShapeId
const B = 'shape:b' as TLShapeId

function shapeAnchor(shapeId: TLShapeId, x = 0.5, y = 0.5): TLCommentAnchor {
	return { type: 'shape', shapeId, x, y, isPrecise: true }
}

/** The outline margin is 8 screen px, so at zoom 1 anything within 8 units counts as on the line. */
const ON_LINE = 3
const OFF_LINE = 40

describe('commentTargetShape', () => {
	describe("shapeAnchorTargets: 'area' (default)", () => {
		it('attaches anywhere within the shape', () => {
			const editor = createFakeEditor({ shapes: [{ id: A, w: 200, h: 100 }] })
			expect(commentTargetShape(editor, { x: 100, y: 50 })?.id).toBe(A)
		})

		it('finds nothing on blank canvas', () => {
			expect(
				commentTargetShape(createFakeEditor({ shapes: [] }), { x: 100, y: 50 })
			).toBeUndefined()
		})

		it('takes the top-most shape when they overlap', () => {
			const editor = createFakeEditor({
				shapes: [
					{ id: A, w: 200, h: 100 },
					{ id: B, w: 200, h: 100 },
				],
			})
			expect(commentTargetShape(editor, { x: 100, y: 50 })?.id).toBe(A)
		})
	})

	describe("shapeAnchorTargets: 'outline'", () => {
		const outline = { shapeAnchorTargets: 'outline' } as const

		it('attaches on the stroke', () => {
			const editor = createFakeEditor({
				options: outline,
				shapes: [{ id: A, w: 200, h: 100, distanceToOutline: ON_LINE }],
			})
			expect(commentTargetShape(editor, { x: 0, y: 50 })?.id).toBe(A)
		})

		it('ignores blank space away from the stroke', () => {
			const editor = createFakeEditor({
				options: outline,
				shapes: [{ id: A, w: 200, h: 100, distanceToOutline: OFF_LINE }],
			})
			expect(commentTargetShape(editor, { x: 100, y: 50 })).toBeUndefined()
		})

		// The reason this isn't `getShapeAtPoint({ hitInside: false })`: a filled shape reports
		// interior points as a negative distance, so that call returns it and swallows the fill.
		it('ignores the inside of a filled shape, where the distance comes back negative', () => {
			const editor = createFakeEditor({
				options: outline,
				shapes: [{ id: A, w: 200, h: 100, distanceToOutline: -OFF_LINE }],
			})
			expect(commentTargetShape(editor, { x: 100, y: 50 })).toBeUndefined()
		})

		it('still attaches just inside the stroke of a filled shape', () => {
			const editor = createFakeEditor({
				options: outline,
				shapes: [{ id: A, w: 200, h: 100, distanceToOutline: -ON_LINE }],
			})
			expect(commentTargetShape(editor, { x: 2, y: 50 })?.id).toBe(A)
		})

		it('falls through to a lower shape whose stroke is under the point', () => {
			const editor = createFakeEditor({
				options: outline,
				shapes: [
					{ id: A, w: 200, h: 100, distanceToOutline: OFF_LINE },
					{ id: B, w: 200, h: 100, distanceToOutline: ON_LINE },
				],
			})
			expect(commentTargetShape(editor, { x: 0, y: 50 })?.id).toBe(B)
		})

		it('scales the margin by zoom, so the stroke is equally reachable zoomed out', () => {
			// 12 page units is outside the 8px margin at zoom 1, inside it at zoom 0.5 (16 units).
			const shapes = [{ id: A, w: 200, h: 100, distanceToOutline: 12 }]
			expect(
				commentTargetShape(createFakeEditor({ options: outline, shapes, zoom: 1 }), { x: 0, y: 0 })
			).toBeUndefined()
			expect(
				commentTargetShape(createFakeEditor({ options: outline, shapes, zoom: 0.5 }), {
					x: 0,
					y: 0,
				})?.id
			).toBe(A)
		})

		it('attaches anywhere on shapes with no stroke to aim at', () => {
			for (const type of ['image', 'video', 'text', 'note', 'bookmark', 'embed']) {
				const editor = createFakeEditor({
					options: outline,
					shapes: [{ id: A, type, w: 200, h: 100, distanceToOutline: OFF_LINE }],
				})
				expect(commentTargetShape(editor, { x: 100, y: 50 })?.id).toBe(A)
			}
		})

		it('does not exempt frames, so a comment inside one is not bound to the frame', () => {
			const editor = createFakeEditor({
				options: outline,
				shapes: [{ id: A, type: 'frame', w: 400, h: 400, distanceToOutline: OFF_LINE }],
			})
			expect(commentTargetShape(editor, { x: 200, y: 200 })).toBeUndefined()
		})
	})
})

describe('resolveCommentDrop', () => {
	describe('normal drag', () => {
		it('attaches to the shape under the point and highlights it', () => {
			const editor = createFakeEditor({ shapes: [{ id: A, w: 200, h: 100 }] })
			// Imprecise under the SDK default, which gates precision on Alt.
			expect(resolveCommentDrop(editor, { x: 50, y: 0 })).toEqual({
				anchor: { type: 'shape', shapeId: A, x: 0.25, y: 0, isPrecise: false },
				highlightShapeId: A,
			})
		})

		it('records the clicked spot whether or not the anchor is precise', () => {
			const editor = createFakeEditor({ shapes: [{ id: A, w: 200, h: 100 }] })
			// `isPrecise` governs rendering; x/y are remembered either way.
			expect(resolveCommentDrop(editor, { x: 150, y: 75 }).anchor).toMatchObject({
				x: 0.75,
				y: 0.75,
			})
		})

		it('defers to shouldBePrecise for precision', () => {
			const editor = createFakeEditor({
				options: { shouldBePrecise: () => true },
				shapes: [{ id: A, w: 200, h: 100 }],
			})
			expect(resolveCommentDrop(editor, { x: 50, y: 0 }).anchor).toMatchObject({
				isPrecise: true,
			})
		})

		it('passes the gesture through to shouldBePrecise', () => {
			const seen: unknown[] = []
			const editor = createFakeEditor({
				options: {
					shouldBePrecise: (_editor, context) => {
						seen.push(context)
						return context.altKey
					},
				},
				shapes: [{ id: A, w: 200, h: 100 }],
			})
			expect(resolveCommentDrop(editor, { x: 50, y: 25 }, { altKey: true }).anchor).toMatchObject({
				isPrecise: true,
			})
			expect(seen).toEqual([{ shapeId: A, point: { x: 50, y: 25 }, altKey: true }])
		})

		it('leaves the comment a free point on blank canvas, with nothing highlighted', () => {
			const editor = createFakeEditor({ shapes: [] })
			expect(resolveCommentDrop(editor, { x: 12, y: 34 })).toEqual({
				anchor: { type: 'point', x: 12, y: 34 },
				highlightShapeId: null,
			})
		})

		// This is how a comment detaches: there is no modifier for it, you drag it off the shape.
		it('detaches an attached comment dragged onto blank canvas', () => {
			const editor = createFakeEditor({ shapes: [] })
			expect(resolveCommentDrop(editor, { x: 100, y: 50 }, { current: shapeAnchor(A) })).toEqual({
				anchor: { type: 'point', x: 100, y: 50 },
				highlightShapeId: null,
			})
		})

		it('re-anchors onto a different shape dragged over', () => {
			const editor = createFakeEditor({ shapes: [{ id: B, w: 200, h: 100 }] })
			const { anchor, highlightShapeId } = resolveCommentDrop(
				editor,
				{ x: 100, y: 50 },
				{ current: shapeAnchor(A) }
			)
			expect(highlightShapeId).toBe(B)
			expect(anchor).toMatchObject({ type: 'shape', shapeId: B })
		})
	})

	describe('constrained drag (Alt)', () => {
		it('keeps the comment on its own shape rather than one stacked on top', () => {
			const editor = createFakeEditor({
				shapes: [
					{ id: B, w: 200, h: 100 },
					{ id: A, w: 200, h: 100 },
				],
			})
			const { anchor, highlightShapeId } = resolveCommentDrop(
				editor,
				{ x: 50, y: 50 },
				{ current: shapeAnchor(A), constrain: true }
			)
			// B is on top and a normal drag would take it; Alt holds the comment on A.
			expect(highlightShapeId).toBe(A)
			expect(anchor).toMatchObject({ type: 'shape', shapeId: A })
		})

		it('clamps to the shape’s box rather than following the pointer out of it', () => {
			const editor = createFakeEditor({ shapes: [{ id: A, w: 200, h: 100 }] })
			const { anchor } = resolveCommentDrop(
				editor,
				{ x: 900, y: -500 },
				{ current: shapeAnchor(A), constrain: true }
			)
			expect(anchor).toEqual({ type: 'shape', shapeId: A, x: 1, y: 0, isPrecise: true })
		})

		it('stays attached over blank canvas, where a normal drag would detach', () => {
			const editor = createFakeEditor({ shapes: [] })
			// The bound shape is gone from the hit test's answer, but Alt doesn't consult it.
			const withShape = createFakeEditor({ shapes: [{ id: A, w: 200, h: 100 }] })
			expect(resolveCommentDrop(editor, { x: 50, y: 25 }, { current: shapeAnchor(A) })).toEqual({
				anchor: { type: 'point', x: 50, y: 25 },
				highlightShapeId: null,
			})
			expect(
				resolveCommentDrop(
					withShape,
					{ x: 50, y: 25 },
					{ current: shapeAnchor(A), constrain: true }
				)
			).toEqual({
				anchor: { type: 'shape', shapeId: A, x: 0.25, y: 0.25, isPrecise: true },
				highlightShapeId: A,
			})
		})

		it('falls back to a normal drag for a comment that is not attached to anything', () => {
			const editor = createFakeEditor({ shapes: [{ id: A, w: 200, h: 100 }] })
			const current: TLCommentAnchor = { type: 'point', x: 0, y: 0 }
			// Nothing to constrain to, so this is an ordinary drop — precision back under the option,
			// which is Alt-gated by default and so imprecise here.
			expect(resolveCommentDrop(editor, { x: 50, y: 0 }, { current, constrain: true })).toEqual({
				anchor: { type: 'shape', shapeId: A, x: 0.25, y: 0, isPrecise: false },
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
		const editor = createFakeEditor({ shapes: [{ id: A, w: 200, h: 100 }] })
		const { anchor, highlightShapeId } = resolveCommentDrop(editor, { x: 50, y: 0 })
		expect(anchor.type === 'shape' && anchor.shapeId).toBe(highlightShapeId)
	})

	// A constrained drag is precise regardless of the option: the whole gesture is choosing a spot
	// within the shape, which an imprecise anchor would throw away.
	it('is precise for a constrained drag even when shouldBePrecise says no', () => {
		const editor = createFakeEditor({
			options: { shouldBePrecise: () => false },
			shapes: [{ id: A, w: 200, h: 100 }],
		})
		expect(
			resolveCommentDrop(editor, { x: 50, y: 25 }, { current: shapeAnchor(A), constrain: true })
				.anchor
		).toMatchObject({ isPrecise: true })
	})
})
