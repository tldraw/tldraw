import { TLFrameShape, TLGeoShape, createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
	box4: createShapeId('box4'),
	box5: createShapeId('box5'),
	frame1: createShapeId('frame1'),
}

beforeEach(() => {
	editor = new TestEditor()
})

describe('when shape is filled', () => {
	let box1: TLGeoShape
	beforeEach(() => {
		editor.createShapes([{ id: ids.box1, type: 'geo', props: { fill: 'solid' } }])
		box1 = editor.getShape<TLGeoShape>(ids.box1)!
	})

	it('hits on pointer down over shape', () => {
		editor.pointerDown(50, 50)
		expect(editor.selectedIds).toEqual([box1.id])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([box1.id])
	})

	it('hits on pointer down over shape margin (inside', () => {
		editor.pointerDown(96, 50)
		expect(editor.selectedIds).toEqual([box1.id])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([box1.id])
	})

	it('hits on pointer down over shape margin (outside)', () => {
		editor.pointerDown(104, 50)
		expect(editor.selectedIds).toEqual([box1.id])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([box1.id])
	})

	it('misses on pointer down outside of shape', () => {
		editor.pointerDown(250, 50)
		expect(editor.selectedIds).toEqual([])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([])
	})

	it('selects and drags on point inside and drag', () => {
		editor.pointerDown(50, 50)
		expect(editor.selectedIds).toEqual([box1.id])
		editor.pointerMove(55, 55)
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([box1.id])
	})
})

describe('when shape is hollow', () => {
	let box1: TLGeoShape
	beforeEach(() => {
		editor.createShapes([{ id: ids.box1, type: 'geo', props: { fill: 'none' } }])
		box1 = editor.getShape<TLGeoShape>(ids.box1)!
	})

	it('misses on pointer down over shape, hits on pointer up', () => {
		editor.pointerDown(50, 50)
		expect(editor.selectedIds).toEqual([])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([box1.id])
	})

	it('hits on pointer down over shape margin (inside)', () => {
		editor.pointerDown(96, 50)
		expect(editor.selectedIds).toEqual([box1.id])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([box1.id])
	})

	it('hits on pointer down over shape margin (outside)', () => {
		editor.pointerDown(104, 50)
		expect(editor.selectedIds).toEqual([box1.id])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([box1.id])
	})

	it('misses on pointer down outside of shape', () => {
		editor.pointerDown(250, 50)
		expect(editor.selectedIds).toEqual([])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([])
	})

	it('brushes on point inside and drag', () => {
		editor.pointerDown(50, 50)
		expect(editor.selectedIds).toEqual([])
		editor.pointerMove(55, 55)
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([])
	})
})

describe('when shape is a frame', () => {
	let frame1: TLFrameShape
	beforeEach(() => {
		editor.createShape<TLFrameShape>({ id: ids.frame1, type: 'frame', props: { w: 100, h: 100 } })
		frame1 = editor.getShape<TLFrameShape>(ids.frame1)!
	})

	it('misses on pointer down over shape, hits on pointer up', () => {
		editor.pointerDown(50, 50)
		expect(editor.selectedIds).toEqual([])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([])
	})

	it('hits on pointer down over shape margin (inside)', () => {
		editor.pointerDown(96, 50)
		expect(editor.selectedIds).toEqual([frame1.id])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([frame1.id])
	})

	it('hits on pointer down over shape margin (outside)', () => {
		editor.pointerDown(104, 50)
		expect(editor.selectedIds).toEqual([frame1.id])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([frame1.id])
	})

	it('misses on pointer down outside of shape', () => {
		editor.pointerDown(250, 50)
		expect(editor.selectedIds).toEqual([])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([])
	})

	it('brushes on point inside and drag', () => {
		editor.pointerDown(50, 50)
		expect(editor.selectedIds).toEqual([])
		editor.pointerMove(55, 55)
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([])
	})
})

describe('when shape is inside of a frame', () => {
	let frame1: TLFrameShape
	let box1: TLGeoShape
	beforeEach(() => {
		editor.createShape<TLFrameShape>({ id: ids.frame1, type: 'frame', props: { w: 100, h: 100 } })
		editor.createShape<TLGeoShape>({
			id: ids.box1,
			parentId: ids.frame1,
			type: 'geo',
			x: 25,
			y: 25,
		})
		frame1 = editor.getShape<TLFrameShape>(ids.frame1)!
		box1 = editor.getShape<TLGeoShape>(ids.box1)!
	})

	it('misses on pointer down over frame, misses on pointer up', () => {
		editor.pointerDown(10, 10) // inside of frame1, outside of box1, outside of all margins
		expect(editor.selectedIds).toEqual([])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([])
	})

	it('misses on pointer down over shape, hits on pointer up', () => {
		editor.pointerDown(50, 50) // inside of box1
		expect(editor.selectedIds).toEqual([])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([box1.id])
	})

	it('misses when shape is masked by frame on pointer down over shape, misses on pointer up', () => {
		editor.pointerDown(110, 50) // inside of box1 but outside of frame1
		expect(editor.selectedIds).toEqual([])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([])
	})

	it('hits frame on pointer down over shape margin (inside)', () => {
		editor.pointerDown(96, 50) // inside of box1, in margin of frame1
		expect(editor.selectedIds).toEqual([frame1.id])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([frame1.id])
	})

	it('hits shape on pointer down over shape margin where intersecting child shape margin (inside)', () => {
		editor.pointerDown(96, 25) // in margin of box1 AND frame1
		expect(editor.selectedIds).toEqual([box1.id])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([box1.id])
	})

	it('hits frame on pointer down over shape margin (outside)', () => {
		editor.pointerDown(104, 25)
		expect(editor.selectedIds).toEqual([frame1.id])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([frame1.id])
	})

	it('misses on pointer down outside of shape', () => {
		editor.pointerDown(250, 50)
		expect(editor.selectedIds).toEqual([])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([])
	})

	it('brushes on point inside and drag', () => {
		editor.pointerDown(50, 50)
		expect(editor.selectedIds).toEqual([])
		editor.pointerMove(55, 55)
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([])
	})
})

describe('when a frame has multiple children', () => {
	let box1: TLGeoShape
	let box2: TLGeoShape
	beforeEach(() => {
		editor
			.createShape<TLFrameShape>({ id: ids.frame1, type: 'frame', props: { w: 100, h: 100 } })
			.createShape<TLGeoShape>({
				id: ids.box1,
				parentId: ids.frame1,
				type: 'geo',
				x: 25,
				y: 25,
			})
			.createShape<TLGeoShape>({
				id: ids.box2,
				parentId: ids.frame1,
				type: 'geo',
				x: 50,
				y: 50,
				props: {
					w: 80,
					h: 80,
				},
			})
		box1 = editor.getShape<TLGeoShape>(ids.box1)!
		box2 = editor.getShape<TLGeoShape>(ids.box2)!
	})

	it('selects the smaller of two overlapping hollow shapes on pointer up when both are the child of a frame', () => {
		// make box2 smaller
		editor.updateShape({ ...box2, props: { w: 99, h: 99 } })
		editor.pointerDown(64, 64)
		expect(editor.selectedIds).toEqual([])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([ids.box2])
		// flip it...
		editor.selectNone()
		editor.updateShape({ ...box2, props: { w: 101, h: 101 } })
		editor.pointerDown(64, 64)
		expect(editor.selectedIds).toEqual([])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([ids.box1])
	})

	it('brush selects a shape inside of the frame', () => {
		editor.pointerDown(10, 10)
		editor.pointerMove(30, 30)
		editor.expectPathToBe('root.select.brushing')
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([ids.box1])
	})

	it('brush selects a shape when dragging from outside of the frame', () => {
		editor.pointerDown(-50, -50)
		editor.pointerMove(30, 30)
		editor.expectPathToBe('root.select.brushing')
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([ids.box1])
	})

	it('brush selects shapes when containing them in a drag from outside of the frame', () => {
		editor.updateShape({ ...box1, x: 10, y: 10, props: { w: 10, h: 10 } })
		editor.updateShape({ ...box2, x: 20, y: 20, props: { w: 10, h: 10 } })
		editor.pointerDown(-50, -50)
		editor.pointerMove(99, 99)
		editor.expectPathToBe('root.select.brushing')
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([ids.box1, ids.box2])
	})

	it('brush selects shapes when containing them in a drag from outside of the frame and also having the current page point outside of the frame without containing the frame', () => {
		editor.updateShape({ ...box1, x: 10, y: 10, props: { w: 10, h: 10 } })
		editor.updateShape({ ...box2, x: 20, y: 20, props: { w: 10, h: 10 } })
		editor.pointerDown(5, -50)
		editor.pointerMove(150, 150)
		editor.expectPathToBe('root.select.brushing')
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([ids.box1, ids.box2])
	})

	it('selects only the frame when brush wraps the entire frame', () => {
		editor.updateShape({ ...box1, x: 10, y: 10, props: { w: 10, h: 10 } })
		editor.updateShape({ ...box2, x: 20, y: 20, props: { w: 10, h: 10 } })
		editor.pointerDown(-50, -50)
		editor.pointerMove(150, 150)
		editor.expectPathToBe('root.select.brushing')
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([ids.frame1])
	})

	it('selects only the frame when brush wraps the entire frame (with overlapping / masked shapes)', () => {
		editor.pointerDown(-50, -50)
		editor.pointerMove(150, 150)
		editor.expectPathToBe('root.select.brushing')
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([ids.frame1])
	})
})

describe('when shape is selected', () => {
	let box1: TLGeoShape
	beforeEach(() => {
		editor.createShapes([{ id: ids.box1, type: 'geo', props: { fill: 'none' } }])
		box1 = editor.getShape<TLGeoShape>(ids.box1)!
		editor.select(ids.box1)
	})

	it('misses on pointer down over shape, hits on pointer up', () => {
		editor.pointerDown(50, 50)
		expect(editor.selectedIds).toEqual([box1.id])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([box1.id])
	})
})

describe('When shapes are overlapping', () => {
	let box1: TLGeoShape
	let box2: TLGeoShape
	let box3: TLGeoShape
	let box4: TLGeoShape
	let box5: TLGeoShape
	beforeEach(() => {
		editor.createShapes<TLGeoShape>([
			{
				id: ids.box1,
				type: 'geo',
				x: 0,
				y: 0,
				props: {
					w: 300,
					h: 300,
				},
			},
			{
				id: ids.box2,
				type: 'geo',
				x: 50,
				y: 50,
				props: {
					w: 100,
					h: 150,
				},
			},
			{
				id: ids.box3,
				type: 'geo',
				x: 75,
				y: 75,
				props: {
					w: 100,
					h: 100,
				},
			},
			{
				id: ids.box4,
				type: 'geo',
				x: 100,
				y: 25,
				props: {
					w: 100,
					h: 100,
					fill: 'solid',
				},
			},
			{
				id: ids.box5,
				type: 'geo',
				x: 125,
				y: 0,
				props: {
					w: 100,
					h: 100,
					fill: 'solid',
				},
			},
		])

		box1 = editor.getShape<TLGeoShape>(ids.box1)!
		box2 = editor.getShape<TLGeoShape>(ids.box2)!
		box3 = editor.getShape<TLGeoShape>(ids.box3)!
		box4 = editor.getShape<TLGeoShape>(ids.box4)!
		box5 = editor.getShape<TLGeoShape>(ids.box5)!

		editor.sendToBack([ids.box4]) // filled shape at back
		editor.bringToFront([ids.box5]) // filled shape in front
		editor.bringToFront([ids.box2]) // filled shape in front
	})

	it('selects the filled shape behind the hollow shapes', () => {
		editor.pointerDown(110, 90)
		expect(editor.selectedIds).toEqual([box4.id])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([box4.id])
	})

	it('selects the hollow above the filled shapes when in margin', () => {
		editor.pointerDown(110, 50)
		expect(editor.selectedIds).toEqual([box2.id])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([box2.id])
	})

	it('selects the front-most filled shape', () => {
		editor.pointerDown(175, 50)
		expect(editor.selectedIds).toEqual([box5.id])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([box5.id])
	})

	it('selects the smallest overlapping hollow shape', () => {
		editor.pointerDown(125, 150)
		expect(editor.selectedIds).toEqual([])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([box3.id])
		editor.selectNone()
		editor.pointerDown(65, 65)
		expect(editor.selectedIds).toEqual([])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([box2.id])
		editor.selectNone()
		editor.pointerDown(35, 35)
		expect(editor.selectedIds).toEqual([])
		editor.pointerUp()
		expect(editor.selectedIds).toEqual([box1.id])
	})
})

it.todo('selects behind selection on pointer up')
it.todo('does not select behind a frame')
it.todo('does not select a hollow closed shape that contains the viewport?')
it.todo('does not select a hollow closed shape if the negative distance is more than X?')
