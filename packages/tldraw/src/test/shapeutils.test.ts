import { createShapeId, TLFrameShape, TLGeoShape } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

afterEach(() => {
	editor?.dispose()
})

const ids = {
	frame1: createShapeId('frame1'),
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
}

beforeEach(() => {
	editor = new TestEditor()

	editor.createShapes([
		{
			id: ids.frame1,
			type: 'frame',
			x: 10,
			y: 10,
			props: {
				w: 100,
				h: 100,
			},
		},
		{
			id: ids.box1,
			type: 'geo',
			x: 200,
			y: 200,
			props: {
				w: 100,
				h: 100,
			},
		},
		{
			id: ids.box2,
			type: 'geo',
			parentId: ids.frame1,
			x: 250,
			y: 250,
			props: {
				w: 100,
				h: 100,
			},
		},
	])
})

describe('When interacting with a shape...', () => {
	it('fires rotate events', () => {
		// Set start / change / end events on only the geo shape
		const util = editor.getShapeUtil<TLFrameShape>('frame')

		const fnStart = jest.fn()
		util.onRotateStart = fnStart

		const fnChange = jest.fn()
		util.onRotate = fnChange

		const fnEnd = jest.fn()
		util.onRotateEnd = fnEnd

		editor.selectAll()
		expect(editor.selectedShapeIds).toMatchObject([ids.frame1, ids.box1])

		editor
			.pointerDown(300, 300, {
				target: 'selection',
				handle: 'bottom_right_rotate',
			})
			.pointerMove(200, 200)
			.pointerUp(200, 200)

		// Once on start (for frame only)
		expect(fnStart).toHaveBeenCalledTimes(1)

		// Once on start, once during the move
		expect(fnChange).toHaveBeenCalledTimes(2)

		// Once on end
		expect(fnEnd).toHaveBeenCalledTimes(1)
	})

	it('cleans up events', () => {
		const util = editor.getShapeUtil<TLGeoShape>('geo')
		expect(util.onRotateStart).toBeUndefined()
	})

	it('fires double click handler event', () => {
		const util = editor.getShapeUtil<TLGeoShape>('geo')

		const fnStart = jest.fn()
		util.onDoubleClick = fnStart

		editor.doubleClick(50, 50, ids.box2)

		expect(fnStart).toHaveBeenCalledTimes(1)
	})

	it('Fires resisizing events', () => {
		const util = editor.getShapeUtil<TLFrameShape>('frame')

		const fnStart = jest.fn()
		util.onResizeStart = fnStart

		const fnChange = jest.fn()
		util.onResize = fnChange

		const fnEnd = jest.fn()
		util.onResizeEnd = fnEnd

		editor.selectAll()
		expect(editor.selectedShapeIds).toMatchObject([ids.frame1, ids.box1])

		editor.pointerDown(300, 300, {
			target: 'selection',
			handle: 'bottom_right',
		})

		editor.expectPathToBe('root.select.pointing_resize_handle')
		editor.pointerMove(200, 200)
		editor.expectPathToBe('root.select.resizing')
		editor.pointerMove(200, 210)
		editor.pointerUp(200, 210)
		editor.expectPathToBe('root.select.idle')

		// Once on start (for frame only)
		expect(fnStart).toHaveBeenCalledTimes(1)

		// Once on start, once during the resize
		expect(fnChange).toHaveBeenCalledTimes(2)

		// Once on end
		expect(fnEnd).toHaveBeenCalledTimes(1)
	})

	it('Fires translating events', () => {
		const util = editor.getShapeUtil<TLFrameShape>('frame')

		const fnStart = jest.fn()
		util.onTranslateStart = fnStart

		const fnChange = jest.fn()
		util.onTranslate = fnChange

		const fnEnd = jest.fn()
		util.onTranslateEnd = fnEnd

		editor.selectAll()
		expect(editor.selectedShapeIds).toMatchObject([ids.frame1, ids.box1])

		// Translate the shapes...
		editor.pointerDown(50, 50, ids.box1).pointerMove(50, 40).pointerUp(50, 40)

		// Once on start for frame
		expect(fnStart).toHaveBeenCalledTimes(1)

		// Once on start, once during the move
		expect(fnChange).toHaveBeenCalledTimes(2)

		// Once on end
		expect(fnEnd).toHaveBeenCalledTimes(1)
	})

	it('Uses the shape utils onClick handler', () => {
		const util = editor.getShapeUtil<TLFrameShape>('frame')

		const fnClick = jest.fn()
		util.onClick = fnClick

		editor.pointerDown(50, 50, ids.frame1)
		editor.pointerUp(50, 50, ids.frame1)

		// If a shape has an onClick handler, and if the handler returns nothing,
		// then normal selection rules should apply.
		expect(editor.selectedShapeIds.length).toBe(1)
	})

	it('Uses the shape utils onClick handler', () => {
		const util = editor.getShapeUtil<TLFrameShape>('frame')

		const fnClick = jest.fn((shape: any) => {
			return {
				...shape,
				x: 100,
				y: 100,
			}
		})

		util.onClick = fnClick

		editor.pointerDown(50, 50, ids.frame1)
		editor.pointerUp(50, 50, ids.frame1)

		// If a shape has an onClick handler, and it returns something, then
		// it should not be selected.
		expect(editor.selectedShapeIds.length).toBe(0)
	})
})
