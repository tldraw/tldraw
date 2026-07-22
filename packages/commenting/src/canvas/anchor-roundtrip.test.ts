import type { TLShapeId } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { createFakeEditor, type FakeShapeSpec } from './test-editor'
import { anchorPagePoint, shapeAnchorAt } from './thread-state'

/**
 * `shapeAnchorAt` and `anchorPagePoint` are inverses, and nothing but these tests enforces it.
 * The round trip is the whole contract: a point placed on a shape has to come back as the same
 * point, whatever the shape is doing.
 *
 * These fail if anchors are resolved against page bounds, because a page-aligned box grows as a
 * shape rotates — the stored fraction then addresses a different part of the shape than it did
 * when it was written, and the pin slides off whatever it was placed on.
 */

const SHAPE = 'shape:a' as TLShapeId

function roundTrip(spec: Omit<FakeShapeSpec, 'id'>, page: { x: number; y: number }) {
	const editor = createFakeEditor({ shapes: [{ id: SHAPE, ...spec }] })
	const anchor = shapeAnchorAt(editor, SHAPE, page, true)
	return anchorPagePoint(editor, anchor)
}

function expectClose(actual: { x: number; y: number } | null, expected: { x: number; y: number }) {
	expect(actual).not.toBeNull()
	expect(actual!.x).toBeCloseTo(expected.x, 6)
	expect(actual!.y).toBeCloseTo(expected.y, 6)
}

describe('shape anchor round trip', () => {
	it('returns the same point for a shape at the origin', () => {
		expectClose(roundTrip({ w: 200, h: 100 }, { x: 50, y: 25 }), { x: 50, y: 25 })
	})

	it('returns the same point for a translated shape', () => {
		expectClose(roundTrip({ x: 300, y: 400, w: 200, h: 100 }, { x: 350, y: 425 }), {
			x: 350,
			y: 425,
		})
	})

	it('returns the same point for a rotated shape', () => {
		expectClose(
			roundTrip({ x: 100, y: 100, w: 200, h: 100, rotation: Math.PI / 4 }, { x: 180, y: 160 }),
			{ x: 180, y: 160 }
		)
	})

	it('returns the same point for a shape rotated past a half turn', () => {
		expectClose(
			roundTrip({ x: -40, y: 90, w: 120, h: 260, rotation: (4 * Math.PI) / 3 }, { x: 12, y: 44 }),
			{ x: 12, y: 44 }
		)
	})

	it('handles a point outside the shape, which Alt-dragging can produce before clamping', () => {
		expectClose(
			roundTrip({ x: 100, y: 100, w: 200, h: 100, rotation: Math.PI / 6 }, { x: 900, y: -300 }),
			{ x: 900, y: -300 }
		)
	})

	// The round trip alone cannot tell the two coordinate spaces apart: any self-consistent pair of
	// functions round-trips. What separates them is storing an anchor and *then* moving the shape,
	// which is the case that actually drifts in production.
	it('keeps pointing at the same spot on the shape after it is rotated', () => {
		const upright = createFakeEditor({ shapes: [{ id: SHAPE, w: 200, h: 100 }] })
		const anchor = shapeAnchorAt(upright, SHAPE, { x: 50, y: 20 }, true)

		const angle = Math.PI / 4
		const rotated = createFakeEditor({ shapes: [{ id: SHAPE, w: 200, h: 100, rotation: angle }] })

		// Still local (50, 20) on the shape, now carried around by the shape's own rotation. Resolved
		// against a page-aligned box it would land somewhere else entirely, because that box grew.
		expectClose(anchorPagePoint(rotated, anchor), {
			x: 50 * Math.cos(angle) - 20 * Math.sin(angle),
			y: 50 * Math.sin(angle) + 20 * Math.cos(angle),
		})
	})

	describe('the stored fraction', () => {
		it('is measured in the shape’s own space, so rotation does not change it', () => {
			// The same physical spot on the shape — its local centre — however the shape is turned.
			const upright = createFakeEditor({ shapes: [{ id: SHAPE, w: 200, h: 100 }] })
			const turned = createFakeEditor({
				shapes: [{ id: SHAPE, w: 200, h: 100, rotation: Math.PI / 3 }],
			})

			const uprightCentre = anchorPagePoint(upright, {
				type: 'shape',
				shapeId: SHAPE,
				x: 0.5,
				y: 0.5,
				isPrecise: true,
			})
			const turnedCentre = anchorPagePoint(turned, {
				type: 'shape',
				shapeId: SHAPE,
				x: 0.5,
				y: 0.5,
				isPrecise: true,
			})

			// Local centre is (100, 50); rotating about the origin moves where that lands on the page,
			// but it is still the centre of the shape rather than a drifted spot.
			expectClose(uprightCentre, { x: 100, y: 50 })
			const angle = Math.PI / 3
			expectClose(turnedCentre, {
				x: 100 * Math.cos(angle) - 50 * Math.sin(angle),
				y: 100 * Math.sin(angle) + 50 * Math.cos(angle),
			})
		})

		it('survives a resize, because the fraction scales with the box', () => {
			const before = createFakeEditor({ shapes: [{ id: SHAPE, w: 200, h: 100 }] })
			const anchor = shapeAnchorAt(before, SHAPE, { x: 150, y: 25 }, true)
			expect(anchor).toEqual({
				type: 'shape',
				shapeId: SHAPE,
				x: 0.75,
				y: 0.25,
				isPrecise: true,
			})

			// Same anchor, shape now twice as wide: the pin stays three-quarters along.
			const after = createFakeEditor({ shapes: [{ id: SHAPE, w: 400, h: 100 }] })
			expectClose(anchorPagePoint(after, anchor), { x: 300, y: 25 })
		})
	})

	describe('degenerate shapes', () => {
		it('centres the axis a perfectly straight line has no extent along', () => {
			const editor = createFakeEditor({ shapes: [{ id: SHAPE, w: 200, h: 0 }] })
			const anchor = shapeAnchorAt(editor, SHAPE, { x: 50, y: 0 }, true)
			// x still normalizes along the line; y has nothing to divide by.
			expect(anchor).toEqual({
				type: 'shape',
				shapeId: SHAPE,
				x: 0.25,
				y: 0.5,
				isPrecise: true,
			})
		})

		it('returns null for a shape that no longer exists', () => {
			const editor = createFakeEditor({ shapes: [] })
			expect(
				anchorPagePoint(editor, {
					type: 'shape',
					shapeId: SHAPE,
					x: 0.5,
					y: 0.5,
					isPrecise: true,
				})
			).toBeNull()
		})
	})

	describe('legacy imprecise anchors', () => {
		it('still render at the consumer default rather than the stored fraction', () => {
			const editor = createFakeEditor({ shapes: [{ id: SHAPE, w: 200, h: 100 }] })
			// Stored x/y are deliberately ignored; the default is the top-right corner.
			expectClose(
				anchorPagePoint(editor, {
					type: 'shape',
					shapeId: SHAPE,
					x: 0.25,
					y: 0.25,
					isPrecise: false,
				}),
				{ x: 200, y: 0 }
			)
		})

		it('honour a custom imprecise anchor', () => {
			const editor = createFakeEditor({ shapes: [{ id: SHAPE, w: 200, h: 100 }] })
			expectClose(
				anchorPagePoint(
					editor,
					{ type: 'shape', shapeId: SHAPE, x: 0.25, y: 0.25, isPrecise: false },
					{ x: 0.5, y: 1 }
				),
				{ x: 100, y: 100 }
			)
		})
	})
})
