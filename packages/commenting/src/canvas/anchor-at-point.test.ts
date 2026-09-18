import type { Editor, TLShape, TLShapeId } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { anchorAtPoint, commentTargetShape } from './thread-state'

const BOUNDS = { minX: 0, minY: 0, maxX: 200, maxY: 100, w: 200, h: 100 }
const SHAPE = { id: 'shape:a' as TLShapeId } as TLShape

/**
 * Stands in for the hit-test surface, recording the options it was asked for. The real hit test is
 * tldraw's to own; what these assert is which question commenting asks — `hitInside` for placement
 * (the default fill is `'none'`, so a geometry-only test leaves hollow shapes unattachable) and
 * outline proximity for dragging.
 */
function stubEditor(
	opts: {
		/** Signed distance from the point to the shape's outline; negative means inside a fill. */
		distance?: number
		shapes?: TLShape[]
	} = {}
) {
	const areaCalls: Array<{ hitInside?: boolean }> = []
	const editor = {
		getShapeAtPoint: (_page: unknown, o: { hitInside?: boolean }) => {
			areaCalls.push(o)
			return SHAPE
		},
		getShapesAtPoint: () => opts.shapes ?? [SHAPE],
		getShapeGeometry: () => ({ distanceToPoint: () => opts.distance ?? 0 }),
		getPointInShapeSpace: (_shape: unknown, page: { x: number; y: number }) => page,
		getZoomLevel: () => 1,
		getShapePageBounds: () => BOUNDS,
	} as unknown as Editor
	return { editor, areaCalls }
}

describe('commentTargetShape', () => {
	it('takes anywhere within the outline by default, so hollow shapes are attachable', () => {
		const { editor, areaCalls } = stubEditor()
		expect(commentTargetShape(editor, { x: 100, y: 50 })).toBeDefined()
		expect(areaCalls).toEqual([{ hitInside: true }])
	})

	it('detaches on Alt without consulting the hit test', () => {
		const { editor, areaCalls } = stubEditor()
		expect(commentTargetShape(editor, { x: 100, y: 50 }, { detach: true })).toBeUndefined()
		expect(areaCalls).toEqual([])
	})

	describe('outline mode', () => {
		it('attaches when the point is on the line', () => {
			const { editor } = stubEditor({ distance: 3 })
			expect(commentTargetShape(editor, { x: 0, y: 50 }, { hit: 'outline' })).toBeDefined()
		})

		it('ignores a point far from the line', () => {
			const { editor } = stubEditor({ distance: 40 })
			expect(commentTargetShape(editor, { x: 100, y: 50 }, { hit: 'outline' })).toBeUndefined()
		})

		// The reason this can't just be `getShapeAtPoint({ hitInside: false })`: a filled shape
		// reports interior points as negative distance, so that call would still swallow the fill.
		it('ignores the interior of a filled shape, where a negative distance signals a fill hit', () => {
			const { editor } = stubEditor({ distance: -40 })
			expect(commentTargetShape(editor, { x: 100, y: 50 }, { hit: 'outline' })).toBeUndefined()
		})

		it('still attaches just inside the line of a filled shape', () => {
			const { editor } = stubEditor({ distance: -2 })
			expect(commentTargetShape(editor, { x: 2, y: 50 }, { hit: 'outline' })).toBeDefined()
		})

		it('detaches on Alt', () => {
			const { editor } = stubEditor({ distance: 0 })
			expect(
				commentTargetShape(editor, { x: 0, y: 50 }, { hit: 'outline', detach: true })
			).toBeUndefined()
		})
	})
})

describe('anchorAtPoint', () => {
	it('anchors to the shape under the point, precisely and exactly where dropped', () => {
		const { editor } = stubEditor()
		expect(anchorAtPoint(editor, { x: 50, y: 25 })).toEqual({
			type: 'shape',
			shapeId: 'shape:a',
			// The drop point's normalized offset within the bounds — not a corner.
			x: 0.25,
			y: 0.25,
			isPrecise: true,
		})
	})

	it('drops a free point when Alt detaches from the shape underneath', () => {
		const { editor } = stubEditor()
		expect(anchorAtPoint(editor, { x: 50, y: 25 }, { detach: true })).toEqual({
			type: 'point',
			x: 50,
			y: 25,
		})
	})

	it('drops a free point when an outline-mode drag misses the line', () => {
		const { editor } = stubEditor({ distance: 40 })
		expect(anchorAtPoint(editor, { x: 50, y: 25 }, { hit: 'outline' })).toEqual({
			type: 'point',
			x: 50,
			y: 25,
		})
	})

	it('drops a free point on empty canvas', () => {
		const editor = {
			getShapeAtPoint: () => undefined,
			getShapePageBounds: () => BOUNDS,
		} as unknown as Editor
		expect(anchorAtPoint(editor, { x: 7, y: 9 })).toEqual({ type: 'point', x: 7, y: 9 })
	})
})
