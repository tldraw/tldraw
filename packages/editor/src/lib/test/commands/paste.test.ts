import { TLFrameShape, TLGeoShape } from '@tldraw/tlschema'
import { TestApp } from '../TestEditor'

let app: TestApp

const ids = {
	box1: TestApp.CreateShapeId('box1'),
	box2: TestApp.CreateShapeId('box2'),
	box3: TestApp.CreateShapeId('box3'),
	frame1: TestApp.CreateShapeId('frame1'),
	frame2: TestApp.CreateShapeId('frame2'),
	frame3: TestApp.CreateShapeId('frame3'),
	frame4: TestApp.CreateShapeId('frame4'),
}

beforeEach(() => {
	app = new TestApp()
	app.createShapes([
		{
			id: ids.frame1,
			type: 'frame',
			x: 0,
			y: 0,
			props: {
				w: 100, // ! we're using w to identify the clones
				h: 100,
			},
		},
		{
			id: ids.frame2,
			type: 'frame',
			x: 0,
			y: 100,
			props: {
				w: 101,
				h: 100,
			},
		},
		{
			id: ids.frame3,
			type: 'frame',
			x: 0,
			y: 200,
			props: {
				w: 102,
				h: 100,
			},
		},
		{
			id: ids.frame4,
			type: 'frame',
			x: 0,
			y: 300,
			props: {
				w: 103,
				h: 100,
			},
		},
		{
			id: ids.box1,
			type: 'geo',
			x: 500,
			y: 500,
			props: {
				w: 88,
			},
		},
		{
			id: ids.box2,
			type: 'geo',
			x: 600,
			y: 600,
			props: {
				w: 89,
			},
		},
		{
			id: ids.box3,
			type: 'geo',
			x: 700,
			y: 700,
			props: {
				w: 90,
			},
		},
	])
})

function getShapes() {
	const arr = app.shapesArray as any[]

	const results = { old: {}, new: {} } as {
		old: Record<string, TLGeoShape | TLFrameShape>
		new: Record<string, TLGeoShape | TLFrameShape>
	}

	Object.entries(ids).map(([normalId, shapeId]) => {
		const shape = app.getShapeById(shapeId as any) as any
		const newShape = arr.find((s) => s.id !== shapeId && s.props.w === shape?.props.w)
		results.old[normalId] = shape
		results.new[normalId] = newShape
	})

	return results
}

it('Gets pasted shapes correctly', () => {
	app.select(ids.box1, ids.box2, ids.frame1, ids.box3)
	app.copy()
	app.selectNone()
	let shapes = getShapes()

	expect(app.sortedShapesArray.map((m) => m.id)).toStrictEqual([
		shapes.old.frame1.id,
		shapes.old.frame2.id,
		shapes.old.frame3.id,
		shapes.old.frame4.id,
		shapes.old.box1.id,
		shapes.old.box2.id,
		shapes.old.box3.id,
	])

	app.paste()

	shapes = getShapes()

	expect(app.sortedShapesArray.map((m) => m.id)).toStrictEqual([
		shapes.old.frame1.id,
		shapes.old.frame2.id,
		shapes.old.frame3.id,
		shapes.old.frame4.id,
		shapes.old.box1.id,
		shapes.old.box2.id,
		shapes.old.box3.id,
		shapes.new.frame1.id,
		shapes.new.box1.id,
		shapes.new.box2.id,
		shapes.new.box3.id,
	])
})

describe('When pasting', () => {
	it('pastes shapes onto the page', () => {
		/*
    Before:
    page
      - frame1
      - frame2
      - frame3
      - frame4
      - box1
      - box2
      - box3

    After:
    page
      - frame1
      - frame2
      - frame3
      - frame4
      - box1
      - box2
      - box3
      - box1copy
      - box2copy
    */

		app.select(ids.box1, ids.box2)
		app.copy()
		app.selectNone()
		app.paste()

		const shapes = getShapes()
		expect(shapes.new.box1?.parentId).toBe(app.currentPageId)
		expect(shapes.new.box2?.parentId).toBe(app.currentPageId)

		expect(app.sortedShapesArray.map((m) => m.id)).toStrictEqual([
			shapes.old.frame1.id,
			shapes.old.frame2.id,
			shapes.old.frame3.id,
			shapes.old.frame4.id,
			shapes.old.box1.id,
			shapes.old.box2.id,
			shapes.old.box3.id,
			shapes.new.box1.id,
			shapes.new.box2.id,
		])
	})

	it('pastes shapes as children of the selected shape when shape is a frame', () => {
		/*
    Before:
    page
      - frame1 *
      - frame2
      - frame3
      - frame4
      - box1
      - box2
      - box3

    After:
    page
      - frame1
        - box1copy *
        - box2copy *
      - frame2
      - frame3
      - frame4
      - box1
      - box2
      - box3
    */
		app.select(ids.box1, ids.box2)
		app.copy()
		app.select(ids.frame1)
		app.paste()

		const shapes = getShapes()

		// Should make the pasted shapes the children of the frame
		expect(shapes.new.box1?.parentId).toBe(shapes.old.frame1.id)
		expect(shapes.new.box2?.parentId).toBe(shapes.old.frame1.id)

		// Should put the pasted shapes centered in the frame
		app.select(shapes.new.box1!.id, shapes.new.box1!.id)
		expect(app.selectionPageCenter).toMatchObject(app.getPageCenterById(ids.frame1)!)
	})

	it('pastes shapes as children of the most common ancestor', () => {
		app.reparentShapesById([ids.frame3], ids.frame1)
		app.reparentShapesById([ids.frame4], ids.frame2)
		app.reparentShapesById([ids.box1], ids.frame3)
		app.reparentShapesById([ids.box2], ids.frame4)
		/*
    Before:
    page
      - frame1 
        - frame3
          - box1 *
      - frame2 
        - frame4
          - box2 *
      - box3

    After:
    page
      - frame1 
        - frame3
          - box1  
      - frame2 
        - frame4
          - box2
      - box3
      - box1copy *
      - box2copy *
    */

		app.select(ids.box1, ids.box2)
		app.copy()
		app.paste()

		const shapes = getShapes()

		// Should make the pasted shapes the children of the frame
		expect(shapes.new.box1?.parentId).toBe(app.currentPageId)
		expect(shapes.new.box2?.parentId).toBe(app.currentPageId)

		// Should put the pasted shapes centered in the frame
		app.select(shapes.new.box1!.id, shapes.new.box1!.id)
		expect(app.getPageBounds(shapes.old.box1)).toMatchObject(app.getPageBounds(shapes.new.box1)!)
	})

	it('pastes shapes as children of the most common ancestor', () => {
		app.reparentShapesById([ids.frame3], ids.frame1)
		app.reparentShapesById([ids.frame4], ids.frame1)
		app.reparentShapesById([ids.box1], ids.frame3)
		app.reparentShapesById([ids.box2], ids.frame4)
		/*
    Before:
    page
      - frame1 
        - frame3
          - box1 *
        - frame4
          - box2 *
      - frame2 
      - box3

    After:
    page
      - frame1 
        - frame3
          - box1  
        - frame4
          - box2 
        - box1copy *
        - box2copy *
      - frame2 
      - box2
      - box3
    */

		app.select(ids.box1, ids.box2)
		app.copy()
		app.paste()

		const shapes = getShapes()

		// Should make the pasted shapes the children of the frame
		expect(shapes.new.box1?.parentId).toBe(shapes.old.frame1.id)
		expect(shapes.new.box2?.parentId).toBe(shapes.old.frame1.id)

		// Should put the pasted shapes centered in the frame
		app.select(shapes.new.box1!.id, shapes.new.box1!.id)
		expect(app.selectionPageCenter).toMatchObject(app.getPageCenter(shapes.old.frame1)!)
	})
})

it('pastes shapes with children', () => {
	app.reparentShapesById([ids.box1, ids.box2], ids.frame3)
	/*
  Before:
  page
    - frame1 
    - frame2 
    - frame3 *
      - box1 
      - box2 
    - frame4
    - box3

  After:
  page
    - frame1 
    - frame2 
    - frame3
      - box1
      - box2
    - frame4
    - box3
    - frame3copy
      - box1copy
      - box2copy
  */

	app.select(ids.frame3)
	app.copy()
	app.paste()

	const shapes = getShapes()

	// Should make the pasted shapes the children of the frame
	expect(shapes.new.box1.parentId).toBe(shapes.new.frame3.id)
	expect(shapes.new.box2.parentId).toBe(shapes.new.frame3.id)
	expect(shapes.new.frame3.parentId).toBe(app.currentPageId)
})

describe('When pasting into frames...', () => {
	it('Does not paste into a clipped frame', () => {
		// clear the page
		app.selectAll().deleteShapes()

		app
			// move the two frames far from all other shapes
			.createShapes([
				{
					id: ids.frame1,
					type: 'frame',
					x: 2000,
					y: 2000,
					props: {
						w: 100,
						h: 100,
					},
				},
				{
					id: ids.frame2,
					type: 'frame',
					x: 2000,
					y: 2000,
					props: {
						w: 100,
						h: 100,
					},
				},
				{
					id: ids.box1,
					type: 'geo',
					x: 500,
					y: 500,
				},
			])
			.setScreenBounds({ x: 0, y: 0, w: 1000, h: 1000 })

		// put frame2 inside frame1
		app.reparentShapesById([ids.frame2], ids.frame1)

		// move frame 2 so that it's clipped AND so that it covers the whole viewport
		app
			.updateShapes([
				{
					id: ids.frame2,
					type: 'frame',
					x: 50,
					y: 50,
					props: {
						w: 2000,
						h: 2000,
					},
				},
			])
			// Make sure that frame 1 is brought to front
			.select(ids.frame1)
			.bringToFront()

		app.setCamera(-2000, -2000, 1)
		app.updateCullingBounds()

		// Copy box 1 (should be out of viewport)
		app.select(ids.box1).copy()

		const shapesBefore = app.shapesArray
		// Paste it
		app.paste()

		const newShape = app.shapesArray.find((s) => !shapesBefore.includes(s))!

		// it should be on the canvas, NOT a child of frame2
		expect(newShape.parentId).not.toBe(ids.frame2)
	})
})
