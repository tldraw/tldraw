import { createShapeId } from '@tldraw/editor'
import { TestEditor, createDefaultShapes, defaultShapesIds } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes(createDefaultShapes())
})

it('gets common bounds', () => {
	// Put the ellipse back on the page to avoid a weird bounding box width
	editor.reparentShapes([defaultShapesIds.ellipse1], editor.currentPageId)

	editor.updateShapes([
		{
			id: defaultShapesIds.box1,
			type: 'geo',
			rotation: 0,
			x: 0,
			y: 0,
			props: { w: 100, h: 100 },
		},
		{
			id: defaultShapesIds.box2,
			type: 'geo',
			rotation: 0,
			x: 300,
			y: 300,
			props: { w: 100, h: 100 },
		},
		{
			id: defaultShapesIds.ellipse1,
			type: 'geo',
			rotation: 0,
			x: 100,
			y: 500,
			props: { w: 100, h: 100 },
		},
	])

	expect(editor.currentPageBounds).toCloselyMatchObject({
		x: 0,
		y: 0,
		h: 600,
		w: 400,
	})

	// Now create a frame and put a box inside it.
	const frame1Id = createShapeId()

	editor.createShapes([
		{
			id: frame1Id,
			type: 'frame',
			x: 600,
			y: 600,
			props: {
				w: 100,
				h: 100,
			},
		},
	])

	expect(editor.currentPageBounds).toCloselyMatchObject({
		x: 0,
		y: 0,
		h: 700,
		w: 700,
	})

	// Reparent a box into the frame. We want it to be clipped by the frame;
	// so that we can check whether the common bounds has changed. (It should be the same)
	editor.reparentShapes([defaultShapesIds.box2], frame1Id)
	editor.updateShapes([
		{
			id: defaultShapesIds.box2,
			type: 'geo',
			rotation: 0,
			x: 50,
			y: 50,
		},
	])

	expect(editor.currentPageBounds).toCloselyMatchObject({
		x: 0,
		y: 0,
		h: 700,
		w: 700,
	})
})
