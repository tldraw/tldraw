import {
	b64Vecs,
	createShapeId,
	TLDrawShape,
	TLGeoShape,
	TLImageShape,
	TLShape,
} from '@tldraw/editor'
import { splitPolylineByPolygon } from '../lib/tools/ScissorsTool/cutShapesWithLasso'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

afterEach(() => {
	editor?.dispose()
})

function createStroke(
	points = [
		{ x: 0, y: 0 },
		{ x: 300, y: 0 },
	]
) {
	const id = createShapeId()
	editor.createShape<TLDrawShape>({
		id,
		type: 'draw',
		x: 0,
		y: 100,
		props: {
			isComplete: true,
			segments: [
				{
					type: 'free',
					path: b64Vecs.encodePoints(
						points.map((p) => ({ ...p, z: 0.5 })),
						3
					),
					dim: 3,
				},
			],
		},
	})
	return id
}

/** Box exposes its edges as getters, which object matchers skip, so project the ones we assert. */
function edges(shape: TLShape) {
	const { minX, maxX, midY } = editor.getShapePageBounds(shape)!
	return { minX, maxX, midY }
}

/** Lasso a square from (x0, y0) to (x1, y1) with the scissors tool. */
function lasso(x0: number, y0: number, x1: number, y1: number) {
	editor.setCurrentTool('scissors')
	editor.pointerDown(x0, y0)
	editor.pointerMove(x1, y0)
	editor.pointerMove(x1, y1)
	editor.pointerMove(x0, y1)
	editor.pointerUp(x0, y1)
}

describe('ScissorsTool', () => {
	describe('State chart', () => {
		it('starts in idle with a cross cursor', () => {
			editor.setCurrentTool('scissors')
			editor.expectToBeIn('scissors.idle')
			expect(editor.getInstanceState().cursor.type).toBe('cross')
		})

		it('transitions to cutting on pointer down and back to idle on pointer up', () => {
			editor.setCurrentTool('scissors')
			editor.pointerDown(0, 0)
			editor.expectToBeIn('scissors.cutting')
			editor.pointerUp(0, 0)
			editor.expectToBeIn('scissors.idle')
		})

		it('cancels a lasso with escape and stays in the tool', () => {
			editor.setCurrentTool('scissors')
			editor.pointerDown(0, 0)
			editor.pointerMove(50, 50)
			editor.cancel()
			editor.expectToBeIn('scissors.idle')
		})

		it('returns to select when escape is pressed while idle', () => {
			editor.setCurrentTool('scissors')
			editor.cancel()
			editor.expectToBeIn('select.idle')
		})
	})

	describe('Cutting strokes', () => {
		it('splits a stroke at the lasso outline and selects the inner piece', () => {
			const id = createStroke()
			lasso(100, 50, 200, 150)

			expect(editor.getShape(id)).toBeUndefined()
			const shapes = editor.getCurrentPageShapes()
			expect(shapes).toHaveLength(3)

			const selected = editor.getSelectedShapes()
			expect(selected).toHaveLength(1)
			expect(edges(selected[0])).toCloselyMatchObject({ minX: 100, maxX: 200, midY: 100 }, 1)
			editor.expectToBeIn('select.idle')

			const remainders = shapes
				.filter((shape) => shape.id !== selected[0].id)
				.map(edges)
				.sort((a, b) => a.minX - b.minX)
			expect(remainders[0]).toCloselyMatchObject({ minX: 0, maxX: 100 }, 1)
			expect(remainders[1]).toCloselyMatchObject({ minX: 200, maxX: 300 }, 1)
		})

		it('keeps stroke styles and meta on the pieces', () => {
			const id = createStroke()
			editor.updateShape<TLDrawShape>({
				id,
				type: 'draw',
				meta: { strokeColor: '#ff0000' },
				props: { color: 'red', size: 'xl', dash: 'dotted' },
			})
			lasso(100, 50, 200, 150)

			for (const shape of editor.getCurrentPageShapes() as TLDrawShape[]) {
				expect(shape.props).toMatchObject({ color: 'red', size: 'xl', dash: 'dotted' })
				expect(shape.meta).toEqual({ strokeColor: '#ff0000' })
			}
		})

		it('selects a stroke whole when the lasso encloses all of it', () => {
			const id = createStroke()
			lasso(-50, 50, 350, 150)

			expect(editor.getCurrentPageShapes()).toHaveLength(1)
			expect(editor.getSelectedShapeIds()).toEqual([id])
			editor.expectToBeIn('select.idle')
		})

		it('leaves a stroke alone when the lasso misses it', () => {
			const id = createStroke()
			lasso(100, 200, 200, 300)

			expect(editor.getCurrentPageShapes().map((shape) => shape.id)).toEqual([id])
			expect(editor.getSelectedShapeIds()).toEqual([])
			editor.expectToBeIn('scissors.idle')
		})

		it('restores the original stroke on undo', () => {
			const id = createStroke()
			lasso(100, 50, 200, 150)
			expect(editor.getShape(id)).toBeUndefined()

			editor.undo()
			expect(editor.getCurrentPageShapes().map((shape) => shape.id)).toEqual([id])
		})

		it('skips locked strokes', () => {
			const id = createStroke()
			editor.updateShape({ id, type: 'draw', isLocked: true })
			lasso(100, 50, 200, 150)

			expect(editor.getCurrentPageShapes().map((shape) => shape.id)).toEqual([id])
		})

		it("keeps pieces inside the stroke's frame", () => {
			const frameId = createShapeId()
			editor.createShape({ id: frameId, type: 'frame', x: 50, y: 50, props: { w: 400, h: 200 } })
			const id = createStroke()
			editor.reparentShapes([id], frameId)
			lasso(100, 50, 200, 150)

			expect(editor.getSortedChildIdsForParent(frameId)).toHaveLength(3)
			expect(edges(editor.getSelectedShapes()[0])).toCloselyMatchObject(
				{ minX: 100, maxX: 200, midY: 100 },
				1
			)
		})

		it('selects a frame taken whole without also selecting its children', () => {
			const frameId = createShapeId()
			editor.createShape({ id: frameId, type: 'frame', x: 50, y: 50, props: { w: 400, h: 200 } })
			const id = createStroke()
			editor.reparentShapes([id], frameId)
			lasso(0, 0, 500, 300)

			expect(editor.getSelectedShapeIds()).toEqual([frameId])
		})

		it('does not cut in a readonly editor', () => {
			const id = createStroke()
			editor.updateInstanceState({ isReadonly: true })
			lasso(100, 50, 200, 150)

			expect(editor.getCurrentPageShapes().map((shape) => shape.id)).toEqual([id])
		})
	})

	describe('Other shapes', () => {
		it('takes a geo shape whole when its centre is inside the lasso', () => {
			const id = createShapeId()
			editor.createShape<TLGeoShape>({ id, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } })
			lasso(120, 120, 220, 220)

			expect(editor.getSelectedShapeIds()).toEqual([id])
			expect(editor.getCurrentPageShapes()).toHaveLength(1)
		})

		it('selects an image whole when every corner is inside the lasso', () => {
			const id = createShapeId()
			editor.createShape<TLImageShape>({
				id,
				type: 'image',
				x: 100,
				y: 100,
				props: { w: 100, h: 50 },
			})
			lasso(50, 50, 250, 200)

			expect(editor.getSelectedShapeIds()).toEqual([id])
			expect(editor.getCurrentPageShapes()).toHaveLength(1)
		})

		it('leaves a geo shape alone when only its edge is inside the lasso', () => {
			const id = createShapeId()
			editor.createShape<TLGeoShape>({ id, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } })
			lasso(180, 90, 260, 210)

			expect(editor.getSelectedShapeIds()).toEqual([])
		})
	})
})

describe('splitPolylineByPolygon', () => {
	const square = [
		{ x: 100, y: 0 },
		{ x: 200, y: 0 },
		{ x: 200, y: 100 },
		{ x: 100, y: 100 },
	]

	it('splits a line crossing a polygon into outside, inside, outside runs', () => {
		const { inside, outside } = splitPolylineByPolygon(
			[
				{ x: 0, y: 50 },
				{ x: 300, y: 50 },
			],
			square
		)
		expect(inside).toEqual([
			[
				{ x: 100, y: 50, z: 0.5 },
				{ x: 200, y: 50, z: 0.5 },
			],
		])
		expect(outside).toEqual([
			[
				{ x: 0, y: 50 },
				{ x: 100, y: 50, z: 0.5 },
			],
			[
				{ x: 200, y: 50, z: 0.5 },
				{ x: 300, y: 50 },
			],
		])
	})

	it('interpolates pressure at the cut', () => {
		const { inside } = splitPolylineByPolygon(
			[
				{ x: 0, y: 50, z: 0 },
				{ x: 200, y: 50, z: 1 },
			],
			square
		)
		expect(inside[0][0].z).toBeCloseTo(0.5)
	})

	it('splits at a vertex that lies exactly on the outline', () => {
		const { inside, outside } = splitPolylineByPolygon(
			[
				{ x: 0, y: 50 },
				{ x: 100, y: 50 },
				{ x: 150, y: 50 },
			],
			square
		)
		expect(inside).toEqual([
			[
				{ x: 100, y: 50 },
				{ x: 150, y: 50 },
			],
		])
		expect(outside).toEqual([
			[
				{ x: 0, y: 50 },
				{ x: 100, y: 50 },
			],
		])
	})

	it('rejoins the two ends of a closed polyline when they fall on the same side', () => {
		const loop = [
			{ x: 0, y: 40 },
			{ x: 150, y: 40 },
			{ x: 150, y: 60 },
			{ x: 0, y: 60 },
			{ x: 0, y: 40 },
		]
		const { inside, outside } = splitPolylineByPolygon(loop, square, { closed: true })
		expect(inside).toHaveLength(1)
		expect(outside).toHaveLength(1)
		expect(outside[0][0]).toEqual({ x: 100, y: 60, z: 0.5 })
		expect(outside[0][outside[0].length - 1]).toEqual({ x: 100, y: 40, z: 0.5 })
	})

	it('classifies a polyline that never crosses', () => {
		const { inside, outside } = splitPolylineByPolygon(
			[
				{ x: 120, y: 20 },
				{ x: 180, y: 80 },
			],
			square
		)
		expect(inside).toHaveLength(1)
		expect(outside).toHaveLength(0)
	})
})
