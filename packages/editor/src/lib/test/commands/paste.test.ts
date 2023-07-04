import { TLFrameShape, TLGeoShape } from '@tldraw/tlschema'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	box1: TestEditor.CreateShapeId('box1'),
	box2: TestEditor.CreateShapeId('box2'),
	box3: TestEditor.CreateShapeId('box3'),
	frame1: TestEditor.CreateShapeId('frame1'),
	frame2: TestEditor.CreateShapeId('frame2'),
	frame3: TestEditor.CreateShapeId('frame3'),
	frame4: TestEditor.CreateShapeId('frame4'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes([
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
	const arr = editor.shapesArray as any[]

	const results = { old: {}, new: {} } as {
		old: Record<string, TLGeoShape | TLFrameShape>
		new: Record<string, TLGeoShape | TLFrameShape>
	}

	Object.entries(ids).map(([normalId, shapeId]) => {
		const shape = editor.getShapeById(shapeId as any) as any
		const newShape = arr.find((s) => s.id !== shapeId && s.props.w === shape?.props.w)
		results.old[normalId] = shape
		results.new[normalId] = newShape
	})

	return results
}

it('Gets pasted shapes correctly', () => {
	editor.select(ids.box1, ids.box2, ids.frame1, ids.box3)
	editor.copy()
	editor.selectNone()
	let shapes = getShapes()

	expect(editor.sortedShapesArray.map((m) => m.id)).toStrictEqual([
		shapes.old.frame1.id,
		shapes.old.frame2.id,
		shapes.old.frame3.id,
		shapes.old.frame4.id,
		shapes.old.box1.id,
		shapes.old.box2.id,
		shapes.old.box3.id,
	])

	editor.paste()

	shapes = getShapes()

	expect(editor.sortedShapesArray.map((m) => m.id)).toStrictEqual([
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

		editor.select(ids.box1, ids.box2)
		editor.copy()
		editor.selectNone()
		editor.paste()

		const shapes = getShapes()
		expect(shapes.new.box1?.parentId).toBe(editor.currentPageId)
		expect(shapes.new.box2?.parentId).toBe(editor.currentPageId)

		expect(editor.sortedShapesArray.map((m) => m.id)).toStrictEqual([
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
		editor.select(ids.box1, ids.box2)
		editor.copy()
		editor.select(ids.frame1)
		editor.paste()

		const shapes = getShapes()

		// Should make the pasted shapes the children of the frame
		expect(shapes.new.box1?.parentId).toBe(shapes.old.frame1.id)
		expect(shapes.new.box2?.parentId).toBe(shapes.old.frame1.id)

		// Should put the pasted shapes centered in the frame
		editor.select(shapes.new.box1!.id, shapes.new.box1!.id)
		expect(editor.selectionPageCenter).toMatchObject(editor.getPageCenterById(ids.frame1)!)
	})

	it('pastes shapes as children of the most common ancestor', () => {
		editor.reparentShapesById([ids.frame3], ids.frame1)
		editor.reparentShapesById([ids.frame4], ids.frame2)
		editor.reparentShapesById([ids.box1], ids.frame3)
		editor.reparentShapesById([ids.box2], ids.frame4)
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

		editor.select(ids.box1, ids.box2)
		editor.copy()
		editor.paste()

		const shapes = getShapes()

		// Should make the pasted shapes the children of the frame
		expect(shapes.new.box1?.parentId).toBe(editor.currentPageId)
		expect(shapes.new.box2?.parentId).toBe(editor.currentPageId)

		// Should put the pasted shapes centered in the frame
		editor.select(shapes.new.box1!.id, shapes.new.box1!.id)
		expect(editor.getPageBounds(shapes.old.box1)).toMatchObject(
			editor.getPageBounds(shapes.new.box1)!
		)
	})

	it('pastes shapes as children of the most common ancestor', () => {
		editor.reparentShapesById([ids.frame3], ids.frame1)
		editor.reparentShapesById([ids.frame4], ids.frame1)
		editor.reparentShapesById([ids.box1], ids.frame3)
		editor.reparentShapesById([ids.box2], ids.frame4)
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

		editor.select(ids.box1, ids.box2)
		editor.copy()
		editor.paste()

		const shapes = getShapes()

		// Should make the pasted shapes the children of the frame
		expect(shapes.new.box1?.parentId).toBe(shapes.old.frame1.id)
		expect(shapes.new.box2?.parentId).toBe(shapes.old.frame1.id)

		// Should put the pasted shapes centered in the frame
		editor.select(shapes.new.box1!.id, shapes.new.box1!.id)
		expect(editor.selectionPageCenter).toMatchObject(editor.getPageCenter(shapes.old.frame1)!)
	})
})

it('pastes shapes with children', () => {
	editor.reparentShapesById([ids.box1, ids.box2], ids.frame3)
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

	editor.select(ids.frame3)
	editor.copy()
	editor.paste()

	const shapes = getShapes()

	// Should make the pasted shapes the children of the frame
	expect(shapes.new.box1.parentId).toBe(shapes.new.frame3.id)
	expect(shapes.new.box2.parentId).toBe(shapes.new.frame3.id)
	expect(shapes.new.frame3.parentId).toBe(editor.currentPageId)
})

describe('When pasting into frames...', () => {
	it('Does not paste into a clipped frame', () => {
		// clear the page
		editor.selectAll().deleteShapes()

		editor
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
		editor.reparentShapesById([ids.frame2], ids.frame1)

		// move frame 2 so that it's clipped AND so that it covers the whole viewport
		editor
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

		editor.setCamera(-2000, -2000, 1)
		editor.updateRenderingBounds()

		// Copy box 1 (should be out of viewport)
		editor.select(ids.box1).copy()

		const shapesBefore = editor.shapesArray
		// Paste it
		editor.paste()

		const newShape = editor.shapesArray.find((s) => !shapesBefore.includes(s))!

		// it should be on the canvas, NOT a child of frame2
		expect(newShape.parentId).not.toBe(ids.frame2)
	})
})
