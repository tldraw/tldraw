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
	group1: createShapeId('group1'),
	group2: createShapeId('group2'),
	group3: createShapeId('group3'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor.setScreenBounds({ w: 3000, h: 3000, x: 0, y: 0 })
})

it('lists a sorted shapes array correctly', () => {
	editor.createShapes([
		{ id: ids.box1, type: 'geo' },
		{ id: ids.box2, type: 'geo' },
		{ id: ids.box3, type: 'geo' },
		{ id: ids.frame1, type: 'frame' },
		{ id: ids.box4, type: 'geo', parentId: ids.frame1 },
		{ id: ids.box5, type: 'geo', parentId: ids.frame1 },
	])

	editor.sendBackward([ids.frame1])
	editor.sendBackward([ids.frame1])

	expect(editor.getCurrentPageShapesSorted().map((s) => s.id)).toEqual([
		ids.box1,
		ids.frame1,
		ids.box4,
		ids.box5,
		ids.box2,
		ids.box3,
	])
})

describe('Hovering shapes', () => {
	beforeEach(() => {
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }])
	})

	it('hovers the margins of hollow shapes but not their insides', () => {
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerMove(-4, 50)
		expect(editor.getHoveredShapeId()).toBe(ids.box1)
		editor.pointerMove(-50, 50)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerMove(4, 50)
		expect(editor.getHoveredShapeId()).toBe(ids.box1)
		editor.pointerMove(75, 75)
		expect(editor.getHoveredShapeId()).toBe(null)
		// does not hover the label of a geo shape when the label is empty
		editor.pointerMove(50, 50)
		expect(editor.getHoveredShapeId()).toBe(null)

		editor.updateShape({ id: ids.box1, type: 'geo', props: { text: 'hello' } })

		// oh there's text now? hover it
		editor.pointerMove(50, 50)
		expect(editor.getHoveredShapeId()).toBe(ids.box1)
	})

	it('selects a shape with a full label on pointer down', () => {
		editor.updateShape({ id: ids.box1, type: 'geo', props: { text: 'hello' } })

		editor.pointerMove(50, 50)
		editor.pointerDown()
		expect(editor.isIn('select.pointing_shape')).toBe(true)
		expect(editor.getSelectedShapes().length).toBe(1)
		editor.pointerUp()
		expect(editor.getSelectedShapes().length).toBe(1)
		expect(editor.isIn('select.idle')).toBe(true)
	})

	it('selects a shape with an empty label on pointer up', () => {
		editor.pointerMove(50, 50)
		editor.pointerDown()
		expect(editor.isIn('select.pointing_canvas')).toBe(true)
		expect(editor.getSelectedShapes().length).toBe(0)
		editor.pointerUp()
		expect(editor.isIn('select.idle')).toBe(true)
		expect(editor.getSelectedShapes().length).toBe(1)
	})

	it('hovers the margins or inside of filled shapes', () => {
		editor.updateShape({ id: ids.box1, type: 'geo', props: { fill: 'solid' } })
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerMove(-4, 50)
		expect(editor.getHoveredShapeId()).toBe(ids.box1)
		editor.pointerMove(-50, 50)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerMove(4, 50)
		expect(editor.getHoveredShapeId()).toBe(ids.box1)
		editor.pointerMove(50, 50)
		expect(editor.getHoveredShapeId()).toBe(ids.box1)
	})

	it('hovers the closest edge or else the highest shape', () => {
		// box2 is above box1
		editor.createShapes([{ id: ids.box2, type: 'geo', x: 6, y: 0, props: { w: 100, h: 100 } }])
		editor.pointerMove(2, 50)
		expect(editor.getHoveredShapeId()).toBe(ids.box1)
		editor.pointerMove(4, 50)
		expect(editor.getHoveredShapeId()).toBe(ids.box2)
		editor.pointerMove(3, 50)
		expect(editor.getHoveredShapeId()).toBe(ids.box2)
		editor.sendToBack([ids.box2])
		editor.pointerMove(3, 50) // ! does not update automatically, only on move
		expect(editor.getHoveredShapeId()).toBe(ids.box1)
	})
})

describe('when shape is filled', () => {
	let box1: TLGeoShape
	beforeEach(() => {
		editor.createShapes([{ id: ids.box1, type: 'geo', props: { fill: 'solid' } }])
		box1 = editor.getShape<TLGeoShape>(ids.box1)!
	})

	it('hits on pointer down over shape', () => {
		editor.pointerMove(50, 50)
		expect(editor.getHoveredShapeId()).toBe(box1.id)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([box1.id])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([box1.id])
	})

	it('hits on pointer down over shape margin (inside', () => {
		editor.pointerMove(95, 50)
		expect(editor.getHoveredShapeId()).toBe(box1.id)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([box1.id])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([box1.id])
	})

	it('hits on pointer down over shape margin (outside)', () => {
		editor.pointerMove(104, 50)
		expect(editor.getHoveredShapeId()).toBe(box1.id)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([box1.id])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([box1.id])
	})

	it('misses on pointer down outside of shape', () => {
		editor.pointerMove(250, 50)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('selects and drags on point inside and drag', () => {
		editor.pointerMove(50, 50)
		expect(editor.getHoveredShapeId()).toBe(box1.id)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([box1.id])
		editor.pointerMove(55, 55)
		editor.expectToBeIn('select.translating')
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([box1.id])
	})
})

describe('when shape is hollow', () => {
	let box1: TLGeoShape
	beforeEach(() => {
		editor.createShapes([{ id: ids.box1, type: 'geo', props: { fill: 'none' } }])
		box1 = editor.getShape<TLGeoShape>(ids.box1)!
	})

	it('misses on pointer down over shape, misses on pointer up', () => {
		editor.pointerMove(75, 75)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('hits on the label', () => {
		editor.pointerMove(-100, -100)
		expect(editor.getHoveredShapeId()).toBe(null)
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerMove(50, 50)
		// no hover over label...
		expect(editor.getHoveredShapeId()).toBe(null)
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerDown()
		// will select on pointer up
		expect(editor.getHoveredShapeId()).toBe(null)
		expect(editor.getSelectedShapeIds()).toEqual([])
		// selects on pointer up
		editor.pointerUp()
		expect(editor.getHoveredShapeId()).toBe(null)
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('missed on the label when the shape is locked', () => {
		editor.updateShape({ id: ids.box1, type: 'geo', isLocked: true })
		editor.pointerMove(-100, -100)
		expect(editor.getHoveredShapeId()).toBe(null)
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerMove(50, 50)
		// no hover over label...
		expect(editor.getHoveredShapeId()).toBe(null)
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerDown()
		// will select on pointer up
		expect(editor.getHoveredShapeId()).toBe(null)
		expect(editor.getSelectedShapeIds()).toEqual([])
		// selects on pointer up
		editor.pointerUp()
		expect(editor.getHoveredShapeId()).toBe(null)
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('hits on pointer down over shape margin (inside)', () => {
		editor.pointerMove(96, 50)
		expect(editor.getHoveredShapeId()).toBe(box1.id)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([box1.id])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([box1.id])
	})

	it('hits on pointer down over shape margin (outside)', () => {
		editor.pointerMove(104, 50)
		expect(editor.getHoveredShapeId()).toBe(box1.id)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([box1.id])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([box1.id])
	})

	it('misses on pointer down outside of shape', () => {
		editor.pointerMove(250, 50)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('brushes on point inside and drag', () => {
		editor.pointerMove(75, 75)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerMove(80, 80)
		editor.expectToBeIn('select.brushing')
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('drags draw shape child', () => {
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.setCurrentTool('draw')
			.pointerMove(500, 500)
			.pointerDown()
			.pointerMove(501, 501)
			.pointerMove(550, 550)
			.pointerMove(599, 599)
			.pointerMove(600, 600)
			.pointerUp()
			.selectAll()
			.setCurrentTool('select')

		expect(editor.getSelectedShapeIds().length).toBe(1)

		// Not inside of the shape but inside of the selection bounds
		editor.pointerMove(510, 590)
		expect(editor.getHoveredShapeId()).toBe(null)

		// Draw shapes have `hideSelectionBoundsBg` set to false
		editor.pointerDown()
		editor.expectToBeIn('select.pointing_selection')
		editor.pointerUp()

		editor.selectAll()
		editor.rotateSelection(Math.PI)
		editor.setCurrentTool('select')
		editor.pointerMove(590, 510)

		editor.pointerDown()
		editor.expectToBeIn('select.pointing_selection')
		editor.pointerUp()
	})

	it('does not drag arrow shape', () => {
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.setCurrentTool('arrow')
			.pointerMove(500, 500)
			.pointerDown()
			.pointerMove(600, 600)
			.pointerUp()
			.selectAll()
			.setCurrentTool('select')

		expect(editor.getSelectedShapeIds().length).toBe(1)

		// Not inside of the shape but inside of the selection bounds
		editor.pointerMove(510, 590)
		expect(editor.getHoveredShapeId()).toBe(null)

		// Arrow shapes have `hideSelectionBoundsBg` set to true
		editor.pointerDown()
		editor.expectToBeIn('select.pointing_canvas')

		editor.selectAll()
		editor.rotateSelection(Math.PI)
		editor.setCurrentTool('select')
		editor.pointerMove(590, 510)

		editor.pointerDown()
		editor.expectToBeIn('select.pointing_canvas')
		editor.pointerUp()
	})

	it('does not drag line shape', () => {
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.setCurrentTool('line')
			.pointerMove(500, 500)
			.pointerDown()
			.pointerMove(600, 600)
			.pointerUp()
			.selectAll()
			.setCurrentTool('select')

		expect(editor.getSelectedShapeIds().length).toBe(1)

		// Not inside of the shape but inside of the selection bounds
		editor.pointerMove(510, 590)
		expect(editor.getHoveredShapeId()).toBe(null)

		// Line shapes have `hideSelectionBoundsBg` set to true
		editor.pointerDown()
		editor.expectToBeIn('select.pointing_canvas')

		editor.selectAll()
		editor.rotateSelection(Math.PI)
		editor.setCurrentTool('select')
		editor.pointerMove(590, 510)

		editor.pointerDown()
		editor.expectToBeIn('select.pointing_canvas')
		editor.pointerUp()
	})
})

describe('when shape is a frame', () => {
	let frame1: TLFrameShape
	beforeEach(() => {
		editor.createShape<TLFrameShape>({ id: ids.frame1, type: 'frame', props: { w: 100, h: 100 } })
		frame1 = editor.getShape<TLFrameShape>(ids.frame1)!
	})

	it('misses on pointer down over shape, hits on pointer up', () => {
		editor.pointerMove(50, 50)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('hits on pointer down over shape margin (inside)', () => {
		editor.pointerMove(96, 50)
		expect(editor.getHoveredShapeId()).toBe(frame1.id)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([frame1.id])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([frame1.id])
	})

	it('hits on pointer down over shape margin (outside)', () => {
		editor.pointerMove(104, 50)
		expect(editor.getHoveredShapeId()).toBe(frame1.id)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([frame1.id])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([frame1.id])
	})

	it('misses on pointer down outside of shape', () => {
		editor.pointerMove(250, 50)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('brushes on point inside and drag', () => {
		editor.pointerMove(50, 50)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerMove(55, 55)
		editor.expectToBeIn('select.brushing')
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([])
	})
})

describe('When a shape is behind a frame', () => {
	beforeEach(() => {
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
		editor.createShape<TLGeoShape>({ id: ids.box1, type: 'geo', x: 25, y: 25 })
		editor.createShape<TLFrameShape>({ id: ids.frame1, type: 'frame', props: { w: 100, h: 100 } })
	})

	it('does not select the shape when clicked inside', () => {
		editor.sendToBack([ids.box1]) // send it to back!
		expect(editor.getCurrentPageShapesSorted().map((s) => s.index)).toEqual(['a1', 'a2'])
		expect(editor.getCurrentPageShapesSorted().map((s) => s.id)).toEqual([ids.box1, ids.frame1])

		editor.pointerMove(50, 50)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('does not select the shape when clicked on its margin', () => {
		editor.pointerMove(25, 25)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([])
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
		editor.pointerMove(10, 10)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown() // inside of frame1, outside of box1, outside of all margins
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('misses on pointer down over shape, misses on pointer up', () => {
		editor.pointerMove(50, 50)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown() // inside of box1 (which is empty)
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerUp() // does not select because inside of hollow shape
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('misses on pointer down over shape, hit on pointer up on the edge', () => {
		editor.pointerMove(25, 25)
		editor.pointerDown() // on the edge of box1 (which is empty)
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		editor.pointerUp() // does not select because inside of hollow shape
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('misses on pointer down over shape, misses on pointer up on the edge when locked', () => {
		editor.updateShape({ id: ids.box1, type: 'geo', isLocked: true })
		editor.pointerMove(25, 25)
		editor.pointerDown() // on the edge of box1 (which is empty)
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerUp() // does not select because inside of hollow shape
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('misses on pointer down over shape, misses on pointer up when locked', () => {
		editor.updateShape({ id: ids.box1, type: 'geo', isLocked: true })
		editor.pointerMove(50, 50)
		editor.pointerDown() // on the edge of box1 (which is empty)
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerUp() // does not select because inside of hollow shape
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('misses on pointer down over shape label, misses on pointer up when locked', () => {
		editor.updateShape({ id: ids.box1, type: 'geo', isLocked: true })
		editor.pointerMove(75, 75)
		editor.pointerDown() // on the edge of box1 (which is empty)
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerUp() // does not select because inside of hollow shape
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('misses when shape is masked by frame on pointer down over shape, misses on pointer up', () => {
		editor.pointerMove(110, 50)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown() // inside of box1 but outside of frame1
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('hits frame on pointer down over shape margin (inside)', () => {
		editor.pointerMove(96, 50)
		expect(editor.getHoveredShapeId()).toBe(frame1.id)
		editor.pointerDown() // inside of box1, in margin of frame1
		expect(editor.getSelectedShapeIds()).toEqual([frame1.id])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([frame1.id])
	})

	it('hits frame on pointer down over shape margin where intersecting child shape margin (inside)', () => {
		editor.pointerMove(96, 25)
		expect(editor.getHoveredShapeId()).toBe(box1.id)
		editor.pointerDown() // in margin of box1 AND frame1
		expect(editor.getSelectedShapeIds()).toEqual([box1.id])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([box1.id])
	})

	it('hits frame on pointer down over shape margin (outside)', () => {
		editor.pointerMove(104, 25)
		expect(editor.getHoveredShapeId()).toBe(frame1.id)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([frame1.id])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([frame1.id])
	})

	it('misses on pointer down outside of shape', () => {
		editor.pointerMove(250, 50)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('brushes on point inside and drag', () => {
		editor.pointerMove(50, 50)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerMove(55, 55)
		editor.expectToBeIn('select.brushing')
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('misses when shape is behind frame', () => {
		editor.deleteShape(ids.box1)
		editor.createShape({
			id: ids.box5,
			parentId: editor.getCurrentPageId(),
			type: 'geo',
			props: {
				w: 75,
				h: 75,
			},
		})
		editor.sendToBack([ids.box5])

		editor.pointerMove(50, 50)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([])

		editor.pointerMove(75, 75)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([])
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

	// This is no longer the case; it will be true for arrows though

	// it('selects the smaller of two overlapping hollow shapes on pointer up when both are the child of a frame', () => {
	// 	// make box2 smaller
	// 	editor.updateShape({ ...box2, props: { w: 99, h: 99 } })

	// 	editor.pointerMove(64, 64)
	// 	expect(editor.hoveredShapeId).toBe(null)
	// 	editor.pointerDown()
	// 	expect(editor.selectedShapeIds).toEqual([])
	// 	editor.pointerUp()
	// 	expect(editor.selectedShapeIds).toEqual([ids.box2])

	// 	// make box2 bigger...
	// 	editor.selectNone()
	// 	editor.updateShape({ ...box2, props: { w: 101, h: 101 } })

	// 	editor.pointerMove(64, 64)
	// 	expect(editor.hoveredShapeId).toBe(null)
	// 	editor.pointerDown()
	// 	expect(editor.selectedShapeIds).toEqual([])
	// 	editor.pointerUp()
	// 	expect(editor.selectedShapeIds).toEqual([ids.box1])
	// })

	it('brush does not select a shape when brushing its masked parts', () => {
		editor.pointerMove(110, 0)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		editor.pointerMove(160, 160)
		editor.expectToBeIn('select.brushing')
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('brush selects a shape inside of the frame', () => {
		editor.pointerMove(10, 10)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		editor.pointerMove(30, 30)
		editor.expectToBeIn('select.brushing')
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('brush selects a shape when dragging from outside of the frame', () => {
		editor.pointerMove(-50, -50)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		editor.pointerMove(30, 30)
		editor.expectToBeIn('select.brushing')
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('brush selects shapes when containing them in a drag from outside of the frame', () => {
		editor.updateShape({ ...box1, x: 10, y: 10, props: { w: 10, h: 10 } })
		editor.updateShape({ ...box2, x: 20, y: 20, props: { w: 10, h: 10 } })

		editor.pointerMove(-50, -50)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		editor.pointerMove(99, 99)
		editor.expectToBeIn('select.brushing')
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box2])
	})

	it('brush selects shapes when containing them in a drag from outside of the frame and also having the current page point outside of the frame without containing the frame', () => {
		editor.updateShape({ ...box1, x: 10, y: 10, props: { w: 10, h: 10 } })
		editor.updateShape({ ...box2, x: 20, y: 20, props: { w: 10, h: 10 } })

		editor.pointerMove(5, -50)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		editor.pointerMove(150, 150)
		editor.expectToBeIn('select.brushing')
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box2])
	})

	it('selects only the frame when brush wraps the entire frame', () => {
		editor.updateShape({ ...box1, x: 10, y: 10, props: { w: 10, h: 10 } })
		editor.updateShape({ ...box2, x: 20, y: 20, props: { w: 10, h: 10 } })

		editor.pointerMove(-50, -50)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		editor.pointerMove(150, 150)
		editor.expectToBeIn('select.brushing')
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.frame1])
	})

	it('selects only the frame when brush wraps the entire frame (with overlapping / masked shapes)', () => {
		editor.pointerMove(-50, -50)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		editor.pointerMove(150, 150)
		editor.expectToBeIn('select.brushing')
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.frame1])
	})
})

describe('when shape is selected', () => {
	it('hits on pointer down over shape, misses on pointer up', () => {
		editor.createShapes([{ id: ids.box1, type: 'geo', props: { fill: 'none' } }])
		editor.select(ids.box1)
		editor.pointerMove(75, 75)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})
})

describe('When shapes are overlapping', () => {
	let box2: TLGeoShape
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

		box2 = editor.getShape<TLGeoShape>(ids.box2)!
		box4 = editor.getShape<TLGeoShape>(ids.box4)!
		box5 = editor.getShape<TLGeoShape>(ids.box5)!

		editor.sendToBack([ids.box4])
		editor.bringToFront([ids.box5])
		editor.bringToFront([ids.box2])

		expect(editor.getCurrentPageShapesSorted().map((s) => s.id)).toEqual([
			ids.box4, // filled
			ids.box1, // hollow
			ids.box3, // hollow
			ids.box5, // filled
			ids.box2, // hollow
		])
	})

	it('selects the filled shape behind the hollow shapes', () => {
		editor.pointerMove(110, 90)
		expect(editor.getHoveredShapeId()).toBe(box4.id)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([box4.id])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([box4.id])
	})

	it('selects the hollow above the filled shapes when in margin', () => {
		expect(editor.getCurrentPageShapesSorted().map((s) => s.id)).toEqual([
			ids.box4,
			ids.box1,
			ids.box3,
			ids.box5,
			ids.box2,
		])

		editor.pointerMove(125, 50)
		expect(editor.getHoveredShapeId()).toBe(box2.id)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([box2.id])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([box2.id])
	})

	it('selects the front-most filled shape', () => {
		editor.pointerMove(175, 50)
		expect(editor.getHoveredShapeId()).toBe(box5.id)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([box5.id])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([box5.id])
	})

	// it('selects the smallest overlapping hollow shape', () => {
	// 	editor.pointerMove(125, 175)
	// 	expect(editor.hoveredShapeId).toBe(null)
	// 	editor.pointerDown()
	// 	expect(editor.selectedShapeIds).toEqual([])
	// 	editor.pointerUp()
	// 	expect(editor.selectedShapeIds).toEqual([box3.id])
	// 	editor.selectNone()
	// 	expect(editor.hoveredShapeId).toBe(null)

	// 	editor.pointerMove(64, 64)
	// 	expect(editor.hoveredShapeId).toBe(null)
	// 	editor.pointerDown()
	// 	expect(editor.selectedShapeIds).toEqual([])
	// 	editor.pointerUp()
	// 	expect(editor.selectedShapeIds).toEqual([box2.id])
	// 	editor.selectNone()

	// 	editor.pointerMove(35, 35)
	// 	expect(editor.hoveredShapeId).toBe(null)
	// 	editor.pointerDown()
	// 	expect(editor.selectedShapeIds).toEqual([])
	// 	editor.pointerUp()
	// 	expect(editor.selectedShapeIds).toEqual([box1.id])
	// })
})

describe('Selects inside of groups', () => {
	beforeEach(() => {
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100, fill: 'solid' } },
		])
		editor.groupShapes([ids.box1, ids.box2], ids.group1)
		editor.selectNone()
	})

	it('cretes the group with the correct bounds', () => {
		expect(editor.getShapeGeometry(ids.group1).bounds).toMatchObject({
			x: 0,
			y: 0,
			w: 300,
			h: 100,
		})
	})

	it('does not selects the group when clicking over the group but between grouped shapes bounds', () => {
		editor.pointerMove(150, 50)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('selects on page down when over an edge of shape in th group children', () => {
		editor.pointerMove(0, 50)
		expect(editor.getHoveredShapeId()).toBe(ids.group1)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([ids.group1])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.group1])
	})

	it('selects on page down when over a filled shape in group children', () => {
		editor.pointerMove(250, 50)
		expect(editor.getHoveredShapeId()).toBe(ids.group1)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([ids.group1])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.group1])
	})

	it('drops selection when pointing up on the space between shapes in a group', () => {
		editor.pointerMove(0, 0)
		expect(editor.getHoveredShapeId()).toBe(ids.group1)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([ids.group1])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.group1])

		editor.pointerMove(150, 50)
		expect(editor.getHoveredShapeId()).toBe(null) // the hovered shape (group1) is already selected
		editor.pointerDown()
		editor.expectToBeIn('select.pointing_selection')
		expect(editor.getSelectedShapeIds()).toEqual([ids.group1])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('selects child when pointing on a filled child shape', () => {
		editor.pointerMove(250, 0)
		expect(editor.getHoveredShapeId()).toBe(ids.group1)
		editor.pointerDown()
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.group1])
		editor.pointerDown()
		editor.expectToBeIn('select.pointing_shape')
		expect(editor.getSelectedShapeIds()).toEqual([ids.group1])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box2])
	})

	// it('selects child when pointing inside of a hollow child shape', () => {
	// 	editor.pointerMove(75, 75)
	// 	expect(editor.hoveredShapeId).toBe(null)
	// 	editor.pointerDown()
	// 	expect(editor.selectedShapeIds).toEqual([])
	// 	editor.pointerUp()
	// 	expect(editor.selectedShapeIds).toEqual([ids.group1])
	// 	editor.pointerDown()
	// 	editor.expectToBeIn('select.pointing_selection')
	// 	expect(editor.selectedShapeIds).toEqual([ids.group1])
	// 	editor.pointerUp()
	// 	expect(editor.selectedShapeIds).toEqual([ids.box1])
	// })

	it('selects a solid shape in a group when double clicking it', () => {
		editor.pointerMove(250, 50)
		expect(editor.getHoveredShapeId()).toBe(ids.group1)
		editor.doubleClick()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box2])
		expect(editor.getFocusedGroupId()).toBe(ids.group1)
	})

	it('selects a solid shape in a group when double clicking its margin', () => {
		editor.pointerMove(198, 50)
		expect(editor.getHoveredShapeId()).toBe(ids.group1)
		editor.doubleClick()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box2])
		expect(editor.getFocusedGroupId()).toBe(ids.group1)
	})

	// it('selects a hollow shape in a group when double clicking it', () => {
	// 	editor.pointerMove(50, 50)
	// 	expect(editor.hoveredShapeId).toBe(null)
	// 	editor.doubleClick()
	// 	expect(editor.selectedShapeIds).toEqual([ids.box1])
	// 	expect(editor.focusedGroupId).toBe(ids.group1)
	// })

	it('selects a hollow shape in a group when double clicking its edge', () => {
		editor.pointerMove(102, 50)
		expect(editor.getHoveredShapeId()).toBe(ids.group1)
		editor.doubleClick()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		expect(editor.getFocusedGroupId()).toBe(ids.group1)
	})

	// it('double clicks a hollow shape when the focus layer is the shapes parent', () => {
	// 	editor.pointerMove(50, 50)
	// 	expect(editor.hoveredShapeId).toBe(null)
	// 	editor.doubleClick()
	// 	editor.doubleClick()
	// 	expect(editor.editingShapeId).toBe(ids.box1)
	// 	editor.expectToBeIn('select.editing_shape')
	// })

	it('double clicks a solid shape to edit it when the focus layer is the shapes parent', () => {
		editor.pointerMove(250, 50)
		expect(editor.getHoveredShapeId()).toBe(ids.group1)
		editor.doubleClick()
		editor.doubleClick()
		expect(editor.getEditingShapeId()).toBe(ids.box2)
		editor.expectToBeIn('select.editing_shape')
	})

	// it('double clicks a sibling shape to edit it when the focus layer is the shapes parent', () => {
	// 	editor.pointerMove(50, 50)
	// 	expect(editor.hoveredShapeId).toBe(null)
	// 	editor.doubleClick()

	// 	editor.pointerMove(250, 50)
	// 	expect(editor.hoveredShapeId).toBe(ids.box2)
	// 	editor.doubleClick()
	// 	expect(editor.editingShapeId).toBe(ids.box2)
	// 	editor.expectToBeIn('select.editing_shape')
	// })

	// it('selects a different sibling shape when editing a layer', () => {
	// 	editor.pointerMove(50, 50)
	// 	expect(editor.hoveredShapeId).toBe(null)
	// 	editor.doubleClick()
	// 	editor.doubleClick()
	// 	expect(editor.editingShapeId).toBe(ids.box1)
	// 	editor.expectToBeIn('select.editing_shape')

	// 	editor.pointerMove(250, 50)
	// 	expect(editor.hoveredShapeId).toBe(ids.box2)
	// 	editor.pointerDown()
	// 	editor.expectToBeIn('select.pointing_shape')
	// 	expect(editor.editingShapeId).toBe(null)
	// 	expect(editor.selectedShapeIds).toEqual([ids.box2])
	// })
})

describe('when selecting behind selection', () => {
	beforeEach(() => {
		editor
			.createShapes([
				{ id: ids.box1, type: 'geo', x: 100, y: 0, props: { fill: 'solid' } },
				{ id: ids.box2, type: 'geo', x: 0, y: 0 },
				{ id: ids.box3, type: 'geo', x: 200, y: 0 },
			])
			.select(ids.box2, ids.box3)
	})

	it('does not select on pointer down, only on pointer up', () => {
		editor.pointerMove(175, 75)
		expect(editor.getHoveredShapeId()).toBe(ids.box1)
		editor.pointerDown() // inside of box 1
		expect(editor.getSelectedShapeIds()).toEqual([ids.box2, ids.box3])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('can drag the selection', () => {
		editor.pointerMove(175, 75)
		expect(editor.getHoveredShapeId()).toBe(ids.box1)
		editor.pointerDown() // inside of box 1
		expect(editor.getSelectedShapeIds()).toEqual([ids.box2, ids.box3])
		editor.pointerMove(250, 50)
		editor.expectToBeIn('select.translating')
		editor.pointerMove(150, 50)
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box2, ids.box3])
	})
})

describe('when shift+selecting', () => {
	beforeEach(() => {
		editor
			.createShapes([
				{ id: ids.box1, type: 'geo', x: 0, y: 0 },
				{ id: ids.box2, type: 'geo', x: 200, y: 0 },
				{ id: ids.box3, type: 'geo', x: 400, y: 0, props: { fill: 'solid' } },
			])
			.select(ids.box1)
	})

	it('adds solid shape to selection on pointer down', () => {
		editor.keyDown('Shift')
		editor.pointerMove(450, 50) // inside of box 3
		expect(editor.getHoveredShapeId()).toBe(ids.box3)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box3])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box3])
	})

	it('adds and removes solid shape from selection on pointer up (without causing a double click)', () => {
		editor.keyDown('Shift')
		editor.pointerMove(450, 50) // above box 3
		expect(editor.getHoveredShapeId()).toBe(ids.box3)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box3])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box3])
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box3])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('adds and removes solid shape from selection on double clicks (without causing an edit by double clicks)', () => {
		editor.keyDown('Shift')
		editor.pointerMove(450, 50) // above box 3
		expect(editor.getHoveredShapeId()).toBe(ids.box3)
		editor.doubleClick()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box3])
		editor.doubleClick()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('adds how shape to selection on pointer down when pointing margin', () => {
		editor.keyDown('Shift')
		editor.pointerMove(204, 50) // inside of box 2 margin
		expect(editor.getHoveredShapeId()).toBe(ids.box2)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box2])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box2])
	})

	it('adds and removes hollow shape from selection on pointer up (without causing a double click) when pointing margin', () => {
		editor.keyDown('Shift')
		editor.pointerMove(204, 50) // inside of box 2 margin
		expect(editor.getHoveredShapeId()).toBe(ids.box2)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box2])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box2])
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box2])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('does not add hollow shape to selection on pointer up when in empty space', () => {
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		editor.keyDown('Shift')
		editor.pointerMove(275, 75) // above box 2
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('does not add hollow shape to selection on pointer up when over the edge/label, but select on pointer up', () => {
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		editor.keyDown('Shift')
		editor.pointerMove(250, 50) // above box 2's label
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box2])
	})

	it('does not add and remove hollow shape from selection on pointer up (without causing an edit by double clicks)', () => {
		editor.keyDown('Shift')
		editor.pointerMove(275, 75) // above box 2, empty space
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('does not add and remove hollow shape from selection on double clicks (without causing an edit by double clicks)', () => {
		editor.keyDown('Shift')
		editor.pointerMove(275, 75) // above box 2, empty space
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.doubleClick()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		editor.doubleClick()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})
})

describe('when shift+selecting a group', () => {
	beforeEach(() => {
		editor
			.createShapes([
				{ id: ids.box1, type: 'geo', x: 0, y: 0 },
				{ id: ids.box2, type: 'geo', x: 200, y: 0 },
				{ id: ids.box3, type: 'geo', x: 400, y: 0, props: { fill: 'solid' } },
				{ id: ids.box4, type: 'geo', x: 600, y: 0 },
			])
			.groupShapes([ids.box2, ids.box3], ids.group1)
			.select(ids.box1)
	})

	it('does not add group to selection when pointing empty space in the group', () => {
		editor.keyDown('Shift')
		editor.pointerMove(350, 50)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown() // inside of box 2, inside of group 1
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('does not add to selection on shift + on pointer up when clicking in hollow shape', () => {
		editor.keyDown('Shift')
		editor.pointerMove(275, 75)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown() // inside of box 2, inside of group 1
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('adds to selection on pointer down when clicking in margin', () => {
		editor.keyDown('Shift')
		editor.pointerMove(304, 50)
		expect(editor.getHoveredShapeId()).toBe(ids.group1)
		editor.pointerDown() // inside of box 2, inside of group 1
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.group1])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.group1])
	})

	it('adds to selection on pointer down when clicking in filled', () => {
		editor.keyDown('Shift')
		editor.pointerMove(450, 50)
		expect(editor.getHoveredShapeId()).toBe(ids.group1)
		editor.pointerDown() // inside of box 2, inside of group 1
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.group1])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.group1])
	})

	it('does not select when shift+clicking into hollow shape inside of a group', () => {
		editor.pointerMove(275, 75)
		editor.keyDown('Shift')
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown() // inside of box 2, empty space, inside of group 1
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('does not deselect on pointer up when clicking into empty space in hollow shape', () => {
		editor.keyDown('Shift')
		editor.pointerMove(275, 75)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown() // inside of box 2, empty space, inside of group 1
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})
})

// some of these tests are adapted from the "select hollow shape on pointer up" logic, which was removed.
// the tests may seem arbitrary but their mostly negating the logic that was introduced in that feature.

describe('When children / descendants of a group are selected', () => {
	beforeEach(() => {
		editor
			.createShapes([
				{ id: ids.box1, type: 'geo', x: 0, y: 0 },
				{ id: ids.box2, type: 'geo', x: 200, y: 0 },
				{ id: ids.box3, type: 'geo', x: 400, y: 0, props: { fill: 'solid' } },
				{ id: ids.box4, type: 'geo', x: 600, y: 0 },
				{ id: ids.box5, type: 'geo', x: 800, y: 0 },
			])
			.groupShapes([ids.box1, ids.box2], ids.group1)
			.groupShapes([ids.box3, ids.box4], ids.group2)
			.groupShapes([ids.group1, ids.group2], ids.group3)
			.selectNone()
	})

	it('selects the child', () => {
		editor.select(ids.box1)
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		expect(editor.getFocusedGroupId()).toBe(ids.group1)
	})

	it('selects the children', () => {
		editor.select(ids.box1, ids.box2)
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box2])
		expect(editor.getFocusedGroupId()).toBe(ids.group1)
	})

	it('does not allow parents and children to be selected, picking the parent', () => {
		editor.select(ids.group1, ids.box1)
		expect(editor.getSelectedShapeIds()).toEqual([ids.group1])
		expect(editor.getFocusedGroupId()).toBe(ids.group3)

		editor.select(ids.group1, ids.box1, ids.box2)
		expect(editor.getSelectedShapeIds()).toEqual([ids.group1])
		expect(editor.getFocusedGroupId()).toBe(ids.group3)
	})

	it('does not allow ancestors and children to be selected, picking the ancestor', () => {
		editor.select(ids.group3, ids.box1)
		expect(editor.getSelectedShapeIds()).toEqual([ids.group3])
		expect(editor.getFocusedGroupId()).toBe(editor.getCurrentPageId())

		editor.select(ids.group3, ids.box1, ids.box2)
		expect(editor.getSelectedShapeIds()).toEqual([ids.group3])
		expect(editor.getFocusedGroupId()).toBe(editor.getCurrentPageId())

		editor.select(ids.group3, ids.group2, ids.box1)
		expect(editor.getSelectedShapeIds()).toEqual([ids.group3])
		expect(editor.getFocusedGroupId()).toBe(editor.getCurrentPageId())
	})

	it('picks the highest common focus layer id', () => {
		editor.select(ids.box1, ids.box4) // child of group1, child of group 2
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box4])
		expect(editor.getFocusedGroupId()).toBe(ids.group3)
	})

	it('picks the highest common focus layer id', () => {
		editor.select(ids.box1, ids.box5) // child of group1 and child of the page
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box5])
		expect(editor.getFocusedGroupId()).toBe(editor.getCurrentPageId())
	})

	it('sets the parent to the highest common ancestor', () => {
		editor.selectNone()
		expect(editor.getFocusedGroupId()).toBe(editor.getCurrentPageId())
		editor.select(ids.group3)
		expect(editor.getFocusedGroupId()).toBe(editor.getCurrentPageId())
		editor.select(ids.group3, ids.box1)
		expect(editor.getFocusedGroupId()).toBe(editor.getCurrentPageId())
		expect(editor.getSelectedShapeIds()).toEqual([ids.group3])
	})
})

describe('When pressing the enter key with groups selected', () => {
	beforeEach(() => {
		editor
			.createShapes([
				{ id: ids.box1, type: 'geo', x: 0, y: 0 },
				{ id: ids.box2, type: 'geo', x: 200, y: 0 },
				{ id: ids.box3, type: 'geo', x: 400, y: 0, props: { fill: 'solid' } },
				{ id: ids.box4, type: 'geo', x: 600, y: 0 },
				{ id: ids.box5, type: 'geo', x: 800, y: 0 },
			])
			.groupShapes([ids.box1, ids.box2], ids.group1)
			.groupShapes([ids.box3, ids.box4], ids.group2)
	})

	it('selects the children of the groups on enter up', () => {
		editor.select(ids.group1, ids.group2)
		editor.keyDown('Enter')
		expect(editor.getSelectedShapeIds()).toEqual([ids.group1, ids.group2])
		expect(editor.getFocusedGroupId()).toBe(editor.getCurrentPageId())
		editor.keyUp('Enter')
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box2, ids.box3, ids.box4])
		expect(editor.getFocusedGroupId()).toBe(editor.getCurrentPageId())
	})

	it('repeats children of the groups on enter up', () => {
		editor.groupShapes([ids.group1, ids.group2], ids.group3)
		editor.select(ids.group3)
		expect(editor.getSelectedShapeIds()).toEqual([ids.group3])
		editor.keyDown('Enter').keyUp('Enter')
		expect(editor.getSelectedShapeIds()).toEqual([ids.group1, ids.group2])
		expect(editor.getFocusedGroupId()).toBe(ids.group3)
		editor.keyDown('Enter').keyUp('Enter')
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box2, ids.box3, ids.box4])
		expect(editor.getFocusedGroupId()).toBe(ids.group3)
	})

	it('does not select the children of the group if a non-group is also selected', () => {
		editor.select(ids.group1, ids.group2, ids.box5)
		editor.keyDown('Enter')
		expect(editor.getSelectedShapeIds()).toEqual([ids.group1, ids.group2, ids.box5])
		editor.keyUp('Enter')
		expect(editor.getSelectedShapeIds()).toEqual([ids.group1, ids.group2, ids.box5])
	})
})

describe('When double clicking an editable shape', () => {
	beforeEach(() => {
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 0, y: 0 },
			{
				id: ids.box2,
				type: 'arrow',
				x: 200,
				y: 50,
				props: {
					start: { type: 'point', x: 0, y: 0 },
					end: { type: 'point', x: 100, y: 0 },
				},
			},
		])
	})

	it('starts editing on double click', () => {
		editor.pointerMove(50, 50).doubleClick()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		expect(editor.getEditingShapeId()).toBe(ids.box1)
		editor.expectToBeIn('select.editing_shape')
	})

	it('does not start editing on double click if shift is down', () => {
		editor.pointerMove(50, 50).keyDown('Shift').doubleClick()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		expect(editor.getEditingShapeId()).toBe(null)
		editor.expectToBeIn('select.idle')
	})

	it('starts editing arrow on double click', () => {
		editor.pointerMove(250, 50)

		editor.doubleClick()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box2])
		expect(editor.getEditingShapeId()).toBe(ids.box2)
		editor.expectToBeIn('select.editing_shape')

		editor.doubleClick()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box2])
		expect(editor.getEditingShapeId()).toBe(ids.box2)
		editor.expectToBeIn('select.editing_shape')
	})

	it('starts editing a child of a group on triple (not double!) click', () => {
		editor.createShape({ id: ids.box2, type: 'geo', x: 300, y: 0 })
		editor.groupShapes([ids.box1, ids.box2], ids.group1)
		editor.selectNone()
		editor.pointerMove(50, 50).click() // clicks on the shape label
		expect(editor.getSelectedShapeIds()).toEqual([ids.group1])
		expect(editor.getEditingShapeId()).toBe(null)
		editor.pointerMove(50, 50).click() // clicks on the shape label
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		expect(editor.getEditingShapeId()).toBe(null)
		editor.pointerMove(50, 50).click() // clicks on the shape label
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		expect(editor.getEditingShapeId()).toBe(ids.box1)
		editor.expectToBeIn('select.editing_shape')
	})
})

describe('shift brushes to add to the selection', () => {
	beforeEach(() => {
		editor
			.createShapes([
				{ id: ids.box1, type: 'geo', x: 0, y: 0 },
				{ id: ids.box2, type: 'geo', x: 200, y: 0 },
				{ id: ids.box3, type: 'geo', x: 400, y: 0 },
				{ id: ids.box4, type: 'geo', x: 600, y: 200 },
			])
			.groupShapes([ids.box3, ids.box4], ids.group1)
	})

	it('does not select when brushing into margin', () => {
		editor.pointerMove(-50, -50)
		editor.pointerDown()
		editor.pointerMove(-1, -1)
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('selects when brushing into shape edge', () => {
		editor.pointerMove(-50, -50)
		editor.pointerDown()
		editor.pointerMove(1, 1)
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('selects when wrapping shape', () => {
		editor.pointerMove(-50, -50)
		editor.pointerDown()
		editor.pointerMove(101, 101)
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('does not select when brushing into shape edge when holding control', () => {
		editor.pointerMove(-50, -50)
		editor.keyDown('Control')
		editor.pointerDown()
		editor.pointerMove(1, 1)
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('selects when wrapping shape when holding control', () => {
		editor.pointerMove(-50, -50)
		editor.keyDown('Control')
		editor.pointerDown()
		editor.pointerMove(101, 101)
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('does not select a group when colliding only with the groups bounds', () => {
		editor.pointerMove(650, -50)
		editor.pointerDown()
		editor.pointerMove(600, 50)
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('selects a group when colliding with the groups child shape', () => {
		editor.pointerMove(650, -50)
		editor.pointerDown()
		editor.pointerMove(600, 250)
		expect(editor.getSelectedShapeIds()).toEqual([ids.group1])
	})

	it('adds to selection when shift + brushing into shape', () => {
		editor.select(ids.box2)
		editor.pointerMove(-50, -50)
		editor.keyDown('Shift')
		editor.pointerDown()
		editor.pointerMove(1, 1)
		expect(editor.getSelectedShapeIds()).toEqual([ids.box2, ids.box1])
		editor.keyUp('Shift')
		// there's a timer here—we should keep the shift mode until the timer expires
		expect(editor.getSelectedShapeIds()).toEqual([ids.box2, ids.box1])
		jest.advanceTimersByTime(500)
		// once the timer expires, we should be back in regular mode
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		editor.keyDown('Shift')
		// there's no timer on key down, so go right into shift mode again
		expect(editor.getSelectedShapeIds()).toEqual([ids.box2, ids.box1])
	})
})

describe('scribble brushes to add to the selection', () => {
	beforeEach(() => {
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 0, y: 0 },
			{ id: ids.box2, type: 'geo', x: 200, y: 0 },
			{ id: ids.box3, type: 'geo', x: 400, y: 0 },
			{ id: ids.box4, type: 'geo', x: 600, y: 200 },
		])
	})

	it('does not select when scribbling into margin', () => {
		editor.pointerMove(-50, -50)
		editor.keyDown('Alt')
		editor.pointerDown()
		editor.pointerMove(-1, -1)
		editor.expectToBeIn('select.scribble_brushing')
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('selects when scribbling into shape edge', () => {
		editor.pointerMove(-50, -50)
		editor.keyDown('Alt')
		editor.pointerDown()
		editor.pointerMove(1, 1)
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('selects when scribbling through shape', () => {
		editor.pointerMove(-50, -50)
		editor.keyDown('Alt')
		editor.pointerDown()
		editor.pointerMove(101, 101)
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('does not select a group when scribble is colliding only with the groups bounds', () => {
		editor.pointerMove(650, -50)
		editor.keyDown('Alt')
		editor.pointerDown()
		editor.pointerMove(600, 50)
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('selects a group when scribble is colliding with the groups child shape', () => {
		editor.groupShapes([ids.box3, ids.box4], ids.group1)
		editor.pointerMove(650, -50)
		editor.keyDown('Alt')
		editor.pointerDown()
		editor.pointerMove(600, 250)
		expect(editor.getSelectedShapeIds()).toEqual([ids.group1])
	})

	it('adds to selection when shift + scribbling into shape', () => {
		editor.select(ids.box2)
		editor.pointerMove(-50, -50)
		editor.keyDown('Alt')
		editor.keyDown('Shift')
		editor.pointerDown()
		editor.pointerMove(50, 50)
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box2])
		editor.keyUp('Shift')
		jest.advanceTimersByTime(500)
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		editor.keyDown('Shift')
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box2])
	})

	it('selects when switching between moves', () => {
		editor.ungroupShapes([ids.group1]) // ungroup boxes 3 and 4
		editor.pointerMove(650, 0)
		editor.keyDown('Alt') // scribble
		editor.pointerDown()
		editor.pointerMove(650, 250) // into box 4
		expect(editor.getSelectedShapeIds()).toEqual([ids.box4])
		editor.pointerMove(450, 250) // below box 3
		expect(editor.getSelectedShapeIds()).toEqual([ids.box4])
		editor.keyUp('Alt') // scribble
		expect(editor.getSelectedShapeIds()).toEqual([ids.box4]) // still in timer
		jest.advanceTimersByTime(1000) // let timer expire
		expect(editor.getSelectedShapeIds()).toEqual([ids.box3, ids.box4]) // brushed!
		editor.keyDown('Alt') // scribble
		expect(editor.getSelectedShapeIds()).toEqual([ids.box4]) // back to brushed only
		editor.pointerMove(450, 240) // below box 3
		expect(editor.getSelectedShapeIds()).toEqual([ids.box4]) // back to brushed only
	})
})

describe('creating text on double click', () => {
	it('creates text on double click', () => {
		editor.doubleClick()
		expect(editor.getCurrentPageShapes().length).toBe(1)
		editor.pointerMove(0, 100)
		editor.click()
	})
})

it.todo('maybe? does not select a hollow closed shape that contains the viewport?')
it.todo('maybe? does not select a hollow closed shape if the negative distance is more than X?')
it.todo(
	'maybe? does not edit a hollow geo shape when double clicking inside of it unless it already has a label OR the double click is in the middle of the shape'
)

it('selects one of the selected shapes on pointer up', () => {
	editor.createShapes([
		{ id: ids.box1, type: 'geo' },
		{ id: ids.box2, type: 'geo', x: 300 },
	])
	editor.selectAll()
	editor.pointerMove(96, 50)
	editor.pointerDown()
	editor.pointerUp()
	expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
})

describe('right clicking', () => {
	it('selects on right click', () => {
		editor.createShapes([{ id: ids.box1, type: 'geo' }])
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.pointerMove(4, 4)
		editor.pointerDown(4, 4, { target: 'canvas', button: 2 })
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('keeps selection when right-clicking a selection background', () => {
		editor.createShapes([{ id: ids.box1, type: 'geo' }])
		editor.selectAll()
		editor.pointerMove(30, 30)
		editor.pointerDown(30, 30, { target: 'canvas', button: 2 })
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('keeps selection when right-clicking a selection background', () => {
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.setCurrentTool('arrow')
			.pointerMove(500, 500)
			.pointerDown()
			.pointerMove(600, 600)
			.pointerUp()
			.selectAll()
			.setCurrentTool('select')

		expect(editor.getSelectedShapeIds().length).toBe(1)

		// Not inside of the shape but inside of the selection bounds
		editor.pointerMove(510, 590)
		expect(editor.getHoveredShapeId()).toBe(null)
		editor.pointerDown(30, 30, { target: 'canvas', button: 2 })
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([])
	})
})
