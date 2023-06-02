import { createDefaultShapes, defaultShapesIds, TestApp } from '../TestEditor'

let app: TestApp

beforeEach(() => {
	app = new TestApp()
	app.createShapes(createDefaultShapes())
})

it('gets common bounds', () => {
	// Put the ellipse back on the page to avoid a weird bounding box width
	app.reparentShapesById([defaultShapesIds.ellipse1], app.currentPageId)

	app.updateShapes([
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

	expect(app.allShapesCommonBounds).toCloselyMatchObject({
		x: 0,
		y: 0,
		h: 600,
		w: 400,
	})

	// Now create a frame and put a box inside it.
	const frame1Id = app.createShapeId()

	app.createShapes([
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

	expect(app.allShapesCommonBounds).toCloselyMatchObject({
		x: 0,
		y: 0,
		h: 700,
		w: 700,
	})

	// Reparent a box into the frame. We want it to be clipped by the frame;
	// so that we can check whether the common bounds has changed. (It should be the same)
	app.reparentShapesById([defaultShapesIds.box2], frame1Id)
	app.updateShapes([
		{
			id: defaultShapesIds.box2,
			type: 'geo',
			rotation: 0,
			x: 50,
			y: 50,
		},
	])

	expect(app.allShapesCommonBounds).toCloselyMatchObject({
		x: 0,
		y: 0,
		h: 700,
		w: 700,
	})
})
