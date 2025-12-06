import { PI, TLShapeId, createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from '../TestEditor'
import { TL } from '../test-jsx'

vi.useFakeTimers()

let editor: TestEditor

const ids = {
	boxA: createShapeId('boxA'),
	boxB: createShapeId('boxB'),
	boxC: createShapeId('boxC'),
	boxD: createShapeId('boxD'),
}

beforeEach(() => {
	editor = new TestEditor()
})

describe('distributeShapes command', () => {
	beforeEach(() => {
		editor.selectAll()
		editor.deleteShapes(editor.getSelectedShapeIds())
		editor.createShapes([
			{
				id: ids.boxA,
				type: 'geo',
				x: 0,
				y: 0,
			},
			{
				id: ids.boxB,
				type: 'geo',
				x: 100,
				y: 100,
			},
			{
				id: ids.boxC,
				type: 'geo',
				x: 400,
				y: 400,
			},
		])
	})

	describe('when less than three shapes are selected', () => {
		it('does nothing', () => {
			editor.setSelectedShapes([ids.boxA, ids.boxB])
			const fn = vi.fn()
			editor.store.listen(fn)
			editor.distributeShapes(editor.getSelectedShapeIds(), 'horizontal')
			vi.advanceTimersByTime(1000)
			expect(fn).not.toHaveBeenCalled()
		})
	})

	describe('When distributing...', () => {
		it('distributeShapes horizontally', () => {
			editor.selectAll()
			editor.distributeShapes(editor.getSelectedShapeIds(), 'horizontal')
			vi.advanceTimersByTime(1000)
			editor.expectShapeToMatch(
				{ id: ids.boxA, x: 0 },
				{ id: ids.boxB, x: 200 },
				{ id: ids.boxC, x: 400 }
			)
		})

		it('distributeShapes horizontally when shapes are clustered', () => {
			editor.updateShapes([{ id: ids.boxC, type: 'geo', x: 25 }])
			editor.selectAll()
			editor.distributeShapes(editor.getSelectedShapeIds(), 'horizontal')
			vi.advanceTimersByTime(1000)
			editor.expectShapeToMatch(
				{ id: ids.boxA, x: 0 },
				{ id: ids.boxB, x: 100 },
				{ id: ids.boxC, x: 50 }
			)
		})

		it('distributeShapes vertically', () => {
			editor.selectAll()
			editor.distributeShapes(editor.getSelectedShapeIds(), 'vertical')
			vi.advanceTimersByTime(1000)
			editor.expectShapeToMatch(
				{ id: ids.boxA, y: 0 },
				{ id: ids.boxB, y: 200 },
				{ id: ids.boxC, y: 400 }
			)
		})

		it('distributeShapes vertically when shapes are clustered', () => {
			editor.updateShapes([{ id: ids.boxC, type: 'geo', y: 25 }])
			editor.selectAll()
			editor.distributeShapes(editor.getSelectedShapeIds(), 'vertical')
			vi.advanceTimersByTime(1000)
			editor.expectShapeToMatch(
				{ id: ids.boxA, y: 0 },
				{ id: ids.boxB, y: 100 },
				{ id: ids.boxC, y: 50 }
			)
		})
	})

	it('distributeShapes shapes that are the child of another shape.', () => {
		editor.selectAll()
		editor.deleteShapes(editor.getSelectedShapeIds())
		editor.createShapes([
			{
				id: ids.boxA,
				type: 'geo',
				x: 0,
				y: 0,
			},
			{
				id: ids.boxB,
				type: 'geo',
				parentId: ids.boxA,
				x: 100,
				y: 100,
			},
			{
				id: ids.boxC,
				type: 'geo',
				x: 200,
				y: 100,
			},
			{
				id: ids.boxD,
				type: 'geo',
				x: 400,
				y: 100,
			},
		])
		editor.setSelectedShapes([ids.boxB, ids.boxC, ids.boxD])

		editor.distributeShapes(editor.getSelectedShapeIds(), 'horizontal')
		vi.advanceTimersByTime(1000)

		editor.expectShapeToMatch(
			{ id: ids.boxB, x: 100 },
			{ id: ids.boxC, x: 250 },
			{ id: ids.boxD, x: 400 }
		)
	})

	it('distributeShapes shapes that are the child of another shape when clustered.', () => {
		editor.selectAll()
		editor.deleteShapes(editor.getSelectedShapeIds())
		editor.createShapes([
			{
				id: ids.boxA,
				type: 'geo',
				x: 0,
				y: 0,
			},
			{
				id: ids.boxB,
				type: 'geo',
				parentId: ids.boxA,
				x: 100,
				y: 100,
			},
			{
				id: ids.boxC,
				type: 'geo',
				x: 200,
				y: 100,
			},
			{
				id: ids.boxD,
				type: 'geo',
				x: 175,
				y: 200,
			},
		])
		editor.setSelectedShapes([ids.boxB, ids.boxC, ids.boxD])

		editor.distributeShapes(editor.getSelectedShapeIds(), 'horizontal')
		vi.advanceTimersByTime(1000)

		editor.expectShapeToMatch(
			{ id: ids.boxB, x: 100 },
			{ id: ids.boxC, x: 200 },
			{ id: ids.boxD, x: 150 }
		)
	})

	it('distributeShapes shapes that are the child of another shape when a parent is rotated.', () => {
		editor = new TestEditor()
		editor.selectAll()
		editor.deleteShapes(editor.getSelectedShapeIds())
		editor.createShapes([
			{
				id: ids.boxA,
				type: 'geo',
				x: 0,
				y: 0,
				rotation: PI,
			},
			{
				id: ids.boxB,
				type: 'geo',
				parentId: ids.boxA,
				x: 100,
				y: 100,
			},
			{
				id: ids.boxC,
				type: 'geo',
				x: 200,
				y: 0,
			},
			{
				id: ids.boxD,
				type: 'geo',
				x: 300,
				y: 0,
			},
		])

		editor.setSelectedShapes([ids.boxB, ids.boxC, ids.boxD])

		editor.distributeShapes(editor.getSelectedShapeIds(), 'horizontal')
		vi.advanceTimersByTime(1000)

		editor.expectShapeToMatch(
			{ id: ids.boxB, x: 100 },
			{ id: ids.boxC, x: 50 },
			{ id: ids.boxD, x: 300 }
		)
	})
})

describe('when shapes are overlapping', () => {
	let ids: Record<string, TLShapeId> = {}

	//     AAAA      DDDDDDDD
	//        BB
	//				 CC
	beforeEach(() => {
		editor = new TestEditor()
		ids = editor.createShapesFromJsx([
			<TL.geo ref="boxA" x={100} y={100} w={100} h={100} />,
			<TL.geo ref="boxB" x={175} y={175} w={50} h={50} />,
			<TL.geo ref="boxC" x={200} y={200} w={50} h={50} />,
			<TL.geo ref="boxD" x={350} y={350} w={200} h={200} />,
		])

		editor.selectAll()
	})

	it('distributes horizontally', () => {
		editor.selectAll().distributeShapes([ids.boxA, ids.boxB, ids.boxC, ids.boxD], 'horizontal')
		// total range is 150 (boxA.maxX = 200, boxD.minX = 350)
		// spaced used by inner shapes is 100 (50 + 50)
		// gap should be ((150 - 100) / 3) = 16.666666666666668

		// does not move the first or last shape
		expect(editor.getShape(ids.boxA)!.x).toBe(100)
		expect(editor.getShape(ids.boxD)!.x).toBe(350)

		expect(editor.getShape(ids.boxB)!.x).toBeCloseTo(200 + 16.67, 1)
		expect(editor.getShape(ids.boxC)!.x).toBeCloseTo(200 + 50 + 16.7 + 16.67, 1)
	})

	it('aligns horizontally', () => {
		editor.selectAll().distributeShapes([ids.boxA, ids.boxB, ids.boxC, ids.boxD], 'vertical')
		// total range is 150 (boxA.maxX = 200, boxD.minX = 350)
		// spaced used by inner shapes is 100 (50 + 50)
		// gap should be ((150 - 100) / 3) = 16.666666666666668

		// does not move the first or last shape
		expect(editor.getShape(ids.boxA)!.y).toBe(100)
		expect(editor.getShape(ids.boxD)!.y).toBe(350)

		expect(editor.getShape(ids.boxB)!.y).toBeCloseTo(200 + 16.67, 1)
		expect(editor.getShape(ids.boxC)!.y).toBeCloseTo(200 + 50 + 16.7 + 16.67, 1)
	})
})

it('preserves common bounds when distributing shapes with a lot of overlap', () => {
	editor = new TestEditor()
	// AAAABBCC EEE
	//     DDDDDD
	const ids = editor.createShapesFromJsx([
		<TL.geo ref="boxA" x={0} y={0} w={100} h={100} />,
		<TL.geo ref="boxB" x={20} y={0} w={15} h={100} />,
		<TL.geo ref="boxC" x={30} y={0} w={10} h={100} />,
		<TL.geo ref="boxD" x={10} y={0} w={380} h={100} />, // ten in from left, ten in from right
		<TL.geo ref="boxE" x={300} y={0} w={100} h={100} />,
	])

	editor.selectAll()

	const prevBounds = editor.getSelectionPageBounds()!

	editor.distributeShapes([ids.boxA, ids.boxB, ids.boxC, ids.boxD, ids.boxE], 'horizontal')

	// If we didn't clamp this, then the right side of boxD would be to the right of boxE's right side
	expect(editor.getShapePageBounds(ids.boxD)!.maxX).toEqual(
		editor.getShapePageBounds(ids.boxE)!.maxX - 1
	)

	// The bounds should be the same as when we started
	expect(editor.getSelectionPageBounds()!).toCloselyMatchObject(prevBounds)

	// this is the best possible handling of an impossible distribution.
	// It's not worth trying to do anything more clever since this would almost certainly never come up.
	// We just need to be sure it's idempotent.

	// fails, but this is what we want:

	// const xsBefore = objectMapFromEntries(
	// 	Object.entries(ids).map(([id, shapeId]) => [id, editor.getShapePageBounds(shapeId)!.x])
	// )
	// editor.distributeShapes([ids.boxA, ids.boxB, ids.boxC, ids.boxD], 'horizontal')
	// expect(editor.getSelectionPageBounds()!).toCloselyMatchObject(prevBounds)

	// const xsAfter = objectMapFromEntries(
	// 	Object.entries(ids).map(([id, shapeId]) => [id, editor.getShapePageBounds(shapeId)!.x])
	// )
	// expect(xsBefore).toCloselyMatchObject(xsAfter)
})
