import { createShapeId, TLFrameShape, TLGeoShape, TLLineShape } from '@tldraw/editor'
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

		const calls: string[] = []

		util.onRotateStart = () => {
			calls.push('start')
		}

		util.onRotate = () => {
			calls.push('change')
		}

		util.onRotateEnd = () => {
			calls.push('end')
		}

		editor.selectAll()
		expect(editor.getSelectedShapeIds()).toMatchObject([ids.frame1, ids.box1])

		editor.pointerDown(300, 300, {
			target: 'selection',
			handle: 'bottom_right_rotate',
		})

		// Should not have called any callbacks yet
		expect(calls).toEqual([])

		editor.pointerMove(200, 200)

		// Should have called start once and change at least once now
		expect(calls).toEqual(['start', 'change'])

		editor.pointerMove(200, 210)

		// Should have called start once and change multiple times
		expect(calls).toEqual(['start', 'change', 'change'])

		editor.pointerUp(200, 210)

		// Should have called end once now
		expect(calls).toEqual(['start', 'change', 'change', 'change', 'end'])
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

		const calls: string[] = []

		util.onResizeStart = () => {
			calls.push('start')
		}

		util.onResize = () => {
			calls.push('change')
		}

		util.onResizeEnd = () => {
			calls.push('end')
		}

		editor.selectAll()
		expect(editor.getSelectedShapeIds()).toMatchObject([ids.frame1, ids.box1])

		editor.pointerDown(300, 300, {
			target: 'selection',
			handle: 'bottom_right',
		})

		editor.expectToBeIn('select.pointing_resize_handle')

		// Should not have called any callbacks yet
		expect(calls).toEqual([])

		editor.pointerMove(200, 200)
		editor.expectToBeIn('select.resizing')

		// Should have called start once and change at least once now
		expect(calls).toEqual(['start', 'change'])

		editor.pointerMove(200, 210)

		// Should have called start once and change multiple times
		expect(calls).toEqual(['start', 'change', 'change'])

		editor.pointerUp(200, 210)
		editor.expectToBeIn('select.idle')

		// Should have called end once now
		expect(calls).toEqual(['start', 'change', 'change', 'end'])
	})

	it('Fires translating events', () => {
		const util = editor.getShapeUtil<TLFrameShape>('frame')

		const calls: string[] = []

		util.onTranslateStart = () => {
			calls.push('start')
		}

		util.onTranslate = () => {
			calls.push('change')
		}

		util.onTranslateEnd = () => {
			calls.push('end')
		}

		editor.selectAll()
		expect(editor.getSelectedShapeIds()).toMatchObject([ids.frame1, ids.box1])

		// Translate the shapes...
		editor.pointerDown(50, 50, ids.box1)

		// Should not have called any callbacks yet
		expect(calls).toEqual([])

		editor.pointerMove(50, 40)

		// Should have called start once and change at least once now
		expect(calls).toEqual(['start', 'change'])

		editor.pointerMove(50, 35)

		// Should have called start once and change multiple times
		expect(calls).toEqual(['start', 'change', 'change'])

		editor.pointerUp(50, 35)

		// Should have called end once now
		expect(calls).toEqual(['start', 'change', 'change', 'change', 'end'])
	})

	it('Uses the shape utils onClick handler', () => {
		const util = editor.getShapeUtil<TLFrameShape>('frame')

		const fnClick = jest.fn()
		util.onClick = fnClick

		editor.pointerDown(50, 50, ids.frame1)
		editor.pointerUp(50, 50, ids.frame1)

		// If a shape has an onClick handler, and if the handler returns nothing,
		// then normal selection rules should apply.
		expect(editor.getSelectedShapeIds().length).toBe(1)
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
		expect(editor.getSelectedShapeIds().length).toBe(0)
	})

	it('Fires handle dragging events', () => {
		// Create a line shape with handles for testing
		const lineId = createShapeId('line1')
		editor.createShapes([
			{
				id: lineId,
				type: 'line',
				x: 100,
				y: 100,
				props: {
					points: {
						a1: { id: 'a1', index: 'a1', x: 0, y: 0 },
						a2: { id: 'a2', index: 'a2', x: 100, y: 100 },
					},
				},
			},
		])

		const util = editor.getShapeUtil<TLLineShape>('line')

		const calls: string[] = []

		util.onHandleDragStart = () => {
			calls.push('start')
		}

		util.onHandleDrag = () => {
			calls.push('change')
		}

		util.onHandleDragEnd = () => {
			calls.push('end')
		}

		editor.select(lineId)

		// Get the handles for the line
		const handles = editor.getShapeHandles(editor.getShape(lineId)!)!
		const vertexHandle = handles.find((h) => h.type === 'vertex')!

		// Get the handle position in page space
		const shape = editor.getShape(lineId)!
		const pageTransform = editor.getShapePageTransform(shape.id)!
		const handlePagePoint = pageTransform.applyToPoint(vertexHandle)

		// Start dragging a handle
		editor.pointerDown(handlePagePoint.x, handlePagePoint.y, {
			target: 'handle',
			shape: editor.getShape(lineId)!,
			handle: vertexHandle,
		})

		editor.expectToBeIn('select.pointing_handle')

		// Should not have called any callbacks yet
		expect(calls).toEqual([])

		editor.pointerMove(handlePagePoint.x + 20, handlePagePoint.y + 20) // Larger move to trigger drag
		editor.expectToBeIn('select.dragging_handle')

		// Should have called start once and change at least once now
		expect(calls).toEqual(['start', 'change'])

		editor.pointerMove(150, 150)

		// Should have called start once and change multiple times
		expect(calls).toEqual(['start', 'change', 'change'])

		editor.pointerUp(150, 150)
		editor.expectToBeIn('select.idle')

		// Should have called end once now
		expect(calls).toEqual(['start', 'change', 'change', 'end'])
	})
})
