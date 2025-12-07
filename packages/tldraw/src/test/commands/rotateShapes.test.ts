import { createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

afterEach(() => {
	editor?.dispose()
})

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
}

beforeEach(() => {
	editor = new TestEditor()

	editor.createShapes([
		{
			id: ids.box1,
			type: 'geo',
			x: 10,
			y: 10,
			props: {
				w: 100,
				h: 100,
			},
		},
		{
			id: ids.box2,
			type: 'geo',
			x: 200,
			y: 200,
			props: {
				w: 100,
				h: 100,
			},
		},
	])
})

describe('editor.rotateShapesBy', () => {
	let fnStart = vi.fn()
	let fnChange = vi.fn()
	let fnEnd = vi.fn()

	beforeEach(() => {
		// Set start / change / end events on only the geo shape
		const util = editor.getShapeUtil('geo')

		// Bad! who did this (did I do this)
		util.onRotateStart = fnStart = vi.fn()

		util.onRotate = fnChange = vi.fn()

		util.onRotateEnd = fnEnd = vi.fn()
	})
	it('Rotates shapes and fires events', () => {
		// Select the shape...
		editor.select(ids.box1, ids.box2)

		const selectionPageCenter = editor.getSelectionPageCenter()

		// Rotate the shape...
		editor.rotateShapesBy(editor.getSelectedShapeIds(), Math.PI)

		// Once for each shape
		expect(fnStart).toHaveBeenCalledTimes(2)

		// Once for each shape
		expect(fnChange).toHaveBeenCalledTimes(2)

		// Once for each shape
		expect(fnEnd).toHaveBeenCalledTimes(2)

		// Are the shapes rotated?
		editor
			.expectShapeToMatch({ id: ids.box1, rotation: Math.PI })
			.expectShapeToMatch({ id: ids.box2, rotation: Math.PI })

		// Are the centers the same?
		expect(selectionPageCenter).toCloselyMatchObject(editor.getSelectionPageCenter()!)
	})

	it('rotates the shapes you pass in only, regardless of selection', () => {
		// Select the shape...
		editor.select(ids.box1, ids.box2)

		// Rotate the shape...
		editor.rotateShapesBy([], Math.PI)

		expect(fnStart).toHaveBeenCalledTimes(0)
		expect(fnChange).toHaveBeenCalledTimes(0)
		expect(fnEnd).toHaveBeenCalledTimes(0)

		editor.rotateShapesBy([ids.box1], Math.PI)
		expect(fnStart).toHaveBeenCalledTimes(1)
		expect(fnChange).toHaveBeenCalledTimes(1)
		expect(fnEnd).toHaveBeenCalledTimes(1)

		// Are the shapes rotated?
		editor
			.expectShapeToMatch({ id: ids.box1, rotation: Math.PI })
			.expectShapeToMatch({ id: ids.box2, rotation: 0 })

		editor.selectNone()

		editor.rotateShapesBy([ids.box2], Math.PI / 2)
		expect(fnStart).toHaveBeenCalledTimes(2)
		expect(fnChange).toHaveBeenCalledTimes(2)
		expect(fnEnd).toHaveBeenCalledTimes(2)

		editor
			.expectShapeToMatch({ id: ids.box1, rotation: Math.PI })
			.expectShapeToMatch({ id: ids.box2, rotation: Math.PI / 2 })
	})

	it('allows to customize the rotation center', () => {
		editor.select(ids.box1, ids.box2)

		editor.rotateShapesBy(editor.getSelectedShapeIds(), Math.PI, { center: { x: 0, y: 0 } })

		editor
			.expectShapeToMatch({ id: ids.box1, rotation: Math.PI })
			.expectShapeToMatch({ id: ids.box2, rotation: Math.PI })

		// Are the centers the same?
		expect(editor.getShapePageBounds(ids.box1)).toCloselyMatchObject({ x: -110, y: -110 })
		expect(editor.getShapePageBounds(ids.box2)).toCloselyMatchObject({ x: -300, y: -300 })
	})
})
