import {
	Box,
	commentSchemaRecords,
	createShapeId,
	createTLSchema,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	defaultTools,
	Editor,
	TLShapeId,
} from 'tldraw'
import { beforeEach, describe, expect, it } from 'vitest'
import {
	anchorPagePoint,
	commentTargetShapeAt,
	impreciseShapePinInset,
	IMPRECISE_PIN_INSET_PX,
	shapeAnchorAt,
} from './thread-state'

/**
 * A real editor: the behavior under test is hit-testing against real shape geometry, which is
 * exactly what a stub can't model.
 */
let editor: Editor

beforeEach(() => {
	editor = new Editor({
		store: createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: defaultTools,
		getContainer: () => document.body,
	})
	editor.updateViewportScreenBounds(new Box(0, 0, 1000, 1000))
})

describe('commentTargetShapeAt', () => {
	it('hits an arrow pointed at near its line', () => {
		const id = createShapeId()
		editor.createShape({
			id,
			type: 'arrow',
			x: 100,
			y: 100,
			props: { start: { x: 0, y: 0 }, end: { x: 200, y: 0 } },
		})

		// Dead on the line, and a couple of pixels off it — both are a hit. Without a hit-test
		// margin only the pixel-perfect click would land, which made arrows uncommentable.
		expect(commentTargetShapeAt(editor, { x: 200, y: 100 })?.id).toBe(id)
		expect(commentTargetShapeAt(editor, { x: 200, y: 102 })?.id).toBe(id)
	})

	it('hits a line shape near its segment', () => {
		const id = createShapeId()
		editor.createShape({ id, type: 'line', x: 100, y: 100 })

		const bounds = editor.getShapePageBounds(id)!
		expect(commentTargetShapeAt(editor, { x: bounds.center.x, y: bounds.center.y })?.id).toBe(id)
	})

	it('hits inside a hollow shape', () => {
		const id = createShapeId()
		editor.createShape({
			id,
			type: 'geo',
			x: 100,
			y: 100,
			props: { w: 100, h: 100, fill: 'none' },
		})

		expect(commentTargetShapeAt(editor, { x: 150, y: 150 })?.id).toBe(id)
	})

	it('returns undefined on empty canvas', () => {
		editor.createShape({
			id: createShapeId(),
			type: 'arrow',
			x: 100,
			y: 100,
			props: { start: { x: 0, y: 0 }, end: { x: 200, y: 0 } },
		})

		expect(commentTargetShapeAt(editor, { x: 600, y: 600 })).toBeUndefined()
	})
})

/** A 100×100 square whose page bounds are (100,100)–(200,200), unrotated. */
function createSquare(): TLShapeId {
	const id = createShapeId()
	editor.createShape({ id, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } })
	return id
}

describe('shape anchors under a shape transform', () => {
	it('carries a precise pin around when the shape rotates', () => {
		const id = createSquare()
		// Top-right corner of the square.
		const anchor = shapeAnchorAt(editor, id, { x: 200, y: 100 }, true)
		expect(anchor).toMatchObject({ type: 'shape', shapeId: id, x: 1, y: 0, isPrecise: true })
		expect(anchorPagePoint(editor, anchor)).toMatchObject({ x: 200, y: 100 })

		// A quarter turn about the square's centre takes that corner to the bottom-right. The
		// square's page bounds don't change, so a pin normalized against them would sit still.
		editor.rotateShapesBy([id], Math.PI / 2)
		const rotated = anchorPagePoint(editor, anchor)!
		expect(rotated.x).toBeCloseTo(200)
		expect(rotated.y).toBeCloseTo(200)
	})

	it('records the spot a pin was dropped on a rotated shape', () => {
		const id = createSquare()
		editor.rotateShapesBy([id], Math.PI / 2)

		// After the quarter turn the square's local top-right corner sits at the page's bottom-right.
		const anchor = shapeAnchorAt(editor, id, { x: 200, y: 200 }, true)
		expect(anchor.type).toBe('shape')
		if (anchor.type !== 'shape') return
		expect(anchor.x).toBeCloseTo(1)
		expect(anchor.y).toBeCloseTo(0)

		const point = anchorPagePoint(editor, anchor)!
		expect(point.x).toBeCloseTo(200)
		expect(point.y).toBeCloseTo(200)
	})

	it('still tracks moves and resizes', () => {
		const id = createSquare()
		const anchor = shapeAnchorAt(editor, id, { x: 200, y: 100 }, true)

		editor.updateShape({ id, type: 'geo', x: 300, props: { w: 200 } })
		expect(anchorPagePoint(editor, anchor)).toMatchObject({ x: 500, y: 100 })
	})

	it('turns an imprecise pin inset with the shape so it keeps stepping inward', () => {
		const id = createSquare()
		const anchor = shapeAnchorAt(editor, id, { x: 200, y: 100 }, false)
		// The default top-right spot: step left and down, into the square.
		expect(impreciseShapePinInset(editor, anchor)).toMatchObject({
			x: -IMPRECISE_PIN_INSET_PX,
			y: IMPRECISE_PIN_INSET_PX,
		})

		editor.rotateShapesBy([id], Math.PI / 2)
		// The corner is now bottom-right, so stepping inward means left and up.
		const inset = impreciseShapePinInset(editor, anchor)!
		expect(inset.x).toBeCloseTo(-IMPRECISE_PIN_INSET_PX)
		expect(inset.y).toBeCloseTo(-IMPRECISE_PIN_INSET_PX)
	})

	it('hides the pin for a shape that no longer exists', () => {
		const id = createSquare()
		const anchor = shapeAnchorAt(editor, id, { x: 200, y: 100 }, true)
		editor.deleteShape(id)
		expect(anchorPagePoint(editor, anchor)).toBe(null)
	})
})
