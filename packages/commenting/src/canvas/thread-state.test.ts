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
} from 'tldraw'
import { beforeEach, describe, expect, it } from 'vitest'
import { commentTargetShapeAt } from './thread-state'

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
