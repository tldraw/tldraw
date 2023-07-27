import { createShapeId } from '@tldraw/editor'
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

describe('editor.rotateShapes', () => {
	it('Rotates shapes and fires events', () => {
		// Set start / change / end events on only the geo shape
		const util = editor.getShapeUtil('geo')

		// Bad! who did this (did I do this)
		const fnStart = jest.fn()
		util.onRotateStart = fnStart

		const fnChange = jest.fn()
		util.onRotate = fnChange

		const fnEnd = jest.fn()
		util.onRotateEnd = fnEnd

		// Select the shape...
		editor.select(ids.box1, ids.box2)

		const { selectionPageCenter } = editor

		// Rotate the shape...
		editor.rotateShapesBy(editor.selectedShapeIds, Math.PI)

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
		expect(selectionPageCenter).toCloselyMatchObject(editor.selectionPageCenter!)
	})
})
