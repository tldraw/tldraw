import { Box, PageRecordType, TLShapeId, createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

const SHAPE_SIZE = { min: 100, max: 300 }
const NUM_QUERIES = 100

type IdAndBounds = { id: TLShapeId; bounds: Box }

function generateShapes() {
	const result: IdAndBounds[] = []
	const numOfShapes = Math.floor(500 + Math.random() * 500)
	for (let i = 0; i < numOfShapes; i++) {
		const xNegative = Math.random() > 0.5
		const yNegative = Math.random() > 0.5
		const x = Math.random() * 10000 * (xNegative ? -1 : 1)
		const y = Math.random() * 10000 * (yNegative ? -1 : 1)
		const id = createShapeId()
		editor.createShape({
			id,
			type: 'geo',
			x,
			y,
			props: {
				w: Math.random() * (SHAPE_SIZE.max - SHAPE_SIZE.min) + SHAPE_SIZE.min,
				h: Math.random() * (SHAPE_SIZE.max - SHAPE_SIZE.min) + SHAPE_SIZE.min,
			},
		})
		const shape = editor.getShape(id)
		if (!shape) continue
		const bounds = editor.getShapePageBounds(shape)
		if (!bounds) continue
		result.push({ id, bounds })
	}
	return result
}

function pickShapes(shapes: IdAndBounds[]) {
	// We pick at max 1/40 of the shapes, so that the common bounds have more chance not to cover the whole area
	const numOfShapes = Math.floor((Math.random() * shapes.length) / 40)
	const pickedShapes: IdAndBounds[] = []
	for (let i = 0; i < numOfShapes; i++) {
		const index = Math.floor(Math.random() * shapes.length)
		pickedShapes.push(shapes[index])
	}
	return pickedShapes
}

describe('Spatial Index', () => {
	it('finds the shapes inside and outside bounds', () => {
		const shapes = generateShapes()
		for (let i = 0; i < NUM_QUERIES; i++) {
			const pickedShapes = pickShapes(shapes)
			const commonBounds = Box.Common(pickedShapes.map((s) => s.bounds))
			let shapeIdsInsideBounds = editor.getShapeIdsInsideBounds(commonBounds)
			// It should include all the shapes inside common bounds
			expect(pickedShapes.every((s) => shapeIdsInsideBounds.includes(s.id))).toBe(true)

			// It also works when we shrink the bounds so that we don't fully contain shapes
			shapeIdsInsideBounds = editor.getShapeIdsInsideBounds(
				commonBounds.expandBy(-SHAPE_SIZE.min / 2)
			)
			expect(pickedShapes.every((s) => shapeIdsInsideBounds.includes(s.id))).toBe(true)

			const shapeIdsOutsideBounds = shapes
				.map((i) => i.id)
				.filter((id) => {
					const shape = editor.getShape(id)
					if (!shape) return false
					const bounds = editor.getShapePageBounds(shape)
					if (!bounds) return false
					return !commonBounds.includes(bounds)
				})
			// It should not contain any shapes outside the bounds
			expect(shapeIdsOutsideBounds.every((id) => !shapeIdsInsideBounds.includes(id))).toBe(true)
			expect(shapeIdsInsideBounds.length + shapeIdsOutsideBounds.length).toBe(shapes.length)
		}
	})

	it('works when switching pages', () => {
		const currentPageId = editor.getCurrentPageId()
		let shapesInsideBounds: TLShapeId[]

		const page1Shapes = generateShapes()
		const page1Picks = pickShapes(page1Shapes)
		const page1CommonBounds = Box.Common(page1Picks.map((s) => s.bounds))
		shapesInsideBounds = editor.getShapeIdsInsideBounds(page1CommonBounds)
		expect(page1Picks.every((s) => shapesInsideBounds.includes(s.id))).toBe(true)

		const newPage = {
			id: PageRecordType.createId(),
			name: 'Page 2',
		}
		editor.createPage(newPage)
		editor.setCurrentPage(newPage.id)

		const page2Shapes = generateShapes()
		const page2Picks = pickShapes(page2Shapes)
		const page2CommonBounds = Box.Common(page2Picks.map((s) => s.bounds))
		shapesInsideBounds = editor.getShapeIdsInsideBounds(page2CommonBounds)
		expect(page2Picks.every((s) => shapesInsideBounds.includes(s.id))).toBe(true)
		expect(page1Shapes.every((s) => !shapesInsideBounds.includes(s.id))).toBe(true)

		editor.setCurrentPage(currentPageId)
		shapesInsideBounds = editor.getShapeIdsInsideBounds(page1CommonBounds)
		expect(page1Picks.every((s) => shapesInsideBounds.includes(s.id))).toBe(true)
		expect(page2Shapes.every((s) => !shapesInsideBounds.includes(s.id))).toBe(true)
	})

	it('works for groups', () => {
		const box1Id = createShapeId()
		const box2Id = createShapeId()
		editor.createShapes([
			{
				id: box1Id,
				props: { w: 100, h: 100, geo: 'rectangle' },
				type: 'geo',
				x: 0,
				y: 0,
			},
			{
				id: box2Id,
				type: 'geo',
				x: 200,
				y: 200,
				props: { w: 100, h: 100, geo: 'rectangle' },
			},
		])

		const groupId = createShapeId()
		editor.groupShapes([box1Id, box2Id], groupId)
		let groupBounds = editor.getShapePageBounds(groupId)
		expect(groupBounds).toEqual({ x: 0, y: 0, w: 300, h: 300 })

		expect(editor.getShapeIdsInsideBounds(groupBounds!)).toEqual([box1Id, box2Id, groupId])

		// Move the group to the right by 1000
		editor.updateShape({ id: groupId, type: 'group', x: 1000 })
		groupBounds = editor.getShapePageBounds(groupId)
		// Make sure the group bounds are updated
		expect(groupBounds).toEqual({ x: 1000, y: 0, w: 300, h: 300 })

		// We only updated the group's position, but spatial index should have also updated
		// the bounds of the shapes inside the group
		expect(editor.getShapeIdsInsideBounds(groupBounds!)).toEqual([box1Id, box2Id, groupId])

		editor.updateShape({ id: box1Id, type: 'geo', x: -1000 })
		const box1Bounds = editor.getShapePageBounds(box1Id)
		expect(box1Bounds).toEqual({ x: 0, y: 0, w: 100, h: 100 })

		// We only updated box1's position, but spatial index should have also updated
		// the bounds of the parent group
		expect(editor.getShapeIdsInsideBounds(box1Bounds!)).toEqual([box1Id, groupId])
	})

	it('works for frames', () => {
		const boxId = createShapeId()
		const frameId = createShapeId()
		editor.createShapes([
			{
				id: boxId,
				props: { w: 100, h: 100, geo: 'rectangle' },
				type: 'geo',
				x: 100,
				y: 100,
			},
			{
				id: frameId,
				type: 'frame',
				x: 0,
				y: 0,
				props: { w: 300, h: 300 },
			},
		])

		editor.reparentShapes([boxId], frameId)
		let frameBounds = editor.getShapePageBounds(frameId)
		expect(frameBounds).toEqual({ x: 0, y: 0, w: 300, h: 300 })

		// move the frame to the right by 1000
		editor.updateShape({ id: frameId, type: 'group', x: 1000 })
		frameBounds = editor.getShapePageBounds(frameId)
		expect(frameBounds).toEqual({ x: 1000, y: 0, w: 300, h: 300 })

		// We only updated the frame's position, but spatial index should have also updated
		// the bounds of the shapes inside the frame
		expect(editor.getShapeIdsInsideBounds(frameBounds!)).toEqual([boxId, frameId])
	})

	it('works for arrows', () => {
		const arrowId = createShapeId()
		const boxId = createShapeId()
		editor.createShapes([
			{
				id: arrowId,
				type: 'arrow',
				props: {
					start: { type: 'point', x: 0, y: 0 },
					end: { type: 'point', x: 100, y: 100 },
				},
			},
			{
				id: boxId,
				type: 'geo',
				x: 200,
				y: 200,
				props: { w: 100, h: 100, geo: 'rectangle' },
			},
		])
		let arrowBounds = editor.getShapePageBounds(arrowId)
		expect(arrowBounds).toEqual({ x: 0, y: 0, w: 100, h: 100 })
		let boxBounds = editor.getShapePageBounds(boxId)
		expect(boxBounds).toEqual({ x: 200, y: 200, w: 100, h: 100 })

		// bind the arrow to the box
		editor.updateShape({
			id: arrowId,
			type: 'arrow',
			props: {
				end: {
					type: 'binding',
					isExact: true,
					boundShapeId: boxId,
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isPrecise: false,
				},
			},
		})
		arrowBounds = editor.getShapePageBounds(arrowId)
		// Arrow extends to the middle of the box now
		expect(arrowBounds).toEqual({ x: 0, y: 0, w: 250, h: 250 })
		// Arrow should be inside the box bounds
		expect(editor.getShapeIdsInsideBounds(boxBounds!)).toEqual([arrowId, boxId])

		// Move the box to the left
		editor.updateShape({
			id: boxId,
			type: 'geo',
			x: -200,
		})
		// We should not see any shapes inside the old bounds any longer
		expect(editor.getShapeIdsInsideBounds(boxBounds!)).toEqual([])
		boxBounds = editor.getShapePageBounds(boxId)
		expect(boxBounds).toEqual({ x: -200, y: 200, w: 100, h: 100 })

		// We only updated the box's position, but spatial index should have also updated
		// the bounds of the arrow bound to it
		expect(editor.getShapeIdsInsideBounds(boxBounds!)).toEqual([arrowId, boxId])
	})

	it('works for shapes that are outside of the viewport, but are then moved inside it', () => {
		const box1Id = createShapeId()
		const box2Id = createShapeId()
		const arrowId = createShapeId()

		editor.createShapes([
			{
				id: box1Id,
				props: { w: 100, h: 100, geo: 'rectangle' },
				type: 'geo',
				x: -500,
				y: 0,
			},
			{
				id: box2Id,
				type: 'geo',
				x: -1000,
				y: 200,
				props: { w: 100, h: 100, geo: 'rectangle' },
			},
			{
				id: arrowId,
				type: 'arrow',
				props: {
					start: {
						type: 'binding',
						isExact: true,
						boundShapeId: box1Id,
						normalizedAnchor: { x: 0.5, y: 0.5 },
						isPrecise: false,
					},
					end: {
						type: 'binding',
						isExact: true,
						boundShapeId: box2Id,
						normalizedAnchor: { x: 0.5, y: 0.5 },
						isPrecise: false,
					},
				},
			},
		])

		const viewportBounds = editor.getViewportPageBounds()
		expect(viewportBounds).toEqual({ x: -0, y: -0, w: 1080, h: 720 })
		expect(editor.getShapeIdsInsideBounds(viewportBounds)).toEqual([])

		// Move box1 and box2 inside the viewport
		editor.updateShapes([
			{ id: box1Id, type: 'geo', x: 100 },
			{ id: box2Id, type: 'geo', x: 200 },
		])
		// Spatial index should also see the arrow
		expect(editor.getShapeIdsInsideBounds(viewportBounds)).toEqual([box1Id, box2Id, arrowId])
	})
})
