import { Box, PageRecordType, TLShapeId, createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

const NUM_SHAPES = 1000
const SHAPE_SIZE = { min: 100, max: 300 }
const NUM_QUERIES = 100

type IdAndBounds = { id: TLShapeId; bounds: Box }

function generateShapes() {
	const result: IdAndBounds[] = []
	for (let i = 0; i < NUM_SHAPES; i++) {
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
	const numOfShapes = Math.floor((Math.random() * NUM_SHAPES) / 40)
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
			expect(shapeIdsInsideBounds.length + shapeIdsOutsideBounds.length).toBe(NUM_SHAPES)
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

		editor.setCurrentPage(currentPageId)
		shapesInsideBounds = editor.getShapeIdsInsideBounds(page1CommonBounds)
		expect(page1Picks.every((s) => shapesInsideBounds.includes(s.id))).toBe(true)
	})
})
