import { Box2d, PI } from '@tldraw/primitives'
import { TLShapeId } from '@tldraw/tlschema'
import { TestEditor } from '../TestEditor'
import { TL } from '../jsx'

let app: TestEditor
let ids: Record<string, TLShapeId>

jest.useFakeTimers()

beforeEach(() => {
	app = new TestEditor()
	ids = app.createShapesFromJsx([
		<TL.geo ref="boxA" x={0} y={0} w={100} h={100} />,
		<TL.geo ref="boxB" x={100} y={100} w={50} h={50} />,
		<TL.geo ref="boxC" x={400} y={400} w={100} h={100} />,
	])

	app.selectAll()
})

describe('when less than two shapes are selected', () => {
	it('does nothing', () => {
		app.setSelectedIds([ids.boxB])

		const fn = jest.fn()
		app.on('update', fn)
		app.alignShapes('top')
		jest.advanceTimersByTime(1000)
		expect(fn).not.toHaveBeenCalled()
	})
})

describe('when multiple shapes are selected', () => {
	it('does, undoes and redoes command', () => {
		app.mark('align')
		app.alignShapes('top')
		jest.advanceTimersByTime(1000)

		app.expectShapeToMatch({ id: ids.boxB, y: 0 })
		app.undo()
		app.expectShapeToMatch({ id: ids.boxB, y: 100 })
		app.redo()
		app.expectShapeToMatch({ id: ids.boxB, y: 0 })
	})

	it('aligns top', () => {
		app.alignShapes('top')
		jest.advanceTimersByTime(1000)

		app.expectShapeToMatch({ id: ids.boxA, y: 0 }, { id: ids.boxB, y: 0 }, { id: ids.boxC, y: 0 })
	})

	it('aligns right', () => {
		app.alignShapes('right')
		jest.advanceTimersByTime(1000)

		app.expectShapeToMatch(
			{ id: ids.boxA, x: 400 },
			{ id: ids.boxB, x: 450 },
			{ id: ids.boxC, x: 400 }
		)
	})

	it('aligns bottom', () => {
		app.alignShapes('bottom')
		jest.advanceTimersByTime(1000)

		app.expectShapeToMatch(
			{ id: ids.boxA, y: 400 },
			{ id: ids.boxB, y: 450 },
			{ id: ids.boxC, y: 400 }
		)
	})

	it('aligns left', () => {
		app.alignShapes('left')
		jest.advanceTimersByTime(1000)

		app.expectShapeToMatch({ id: ids.boxA, x: 0 }, { id: ids.boxB, x: 0 }, { id: ids.boxC, x: 0 })
	})

	it('aligns center horizontal', () => {
		app.alignShapes('center-horizontal')
		jest.advanceTimersByTime(1000)

		app.expectShapeToMatch(
			{ id: ids.boxA, x: 200 },
			{ id: ids.boxB, x: 225 },
			{ id: ids.boxC, x: 200 }
		)
	})

	it('aligns center vertical', () => {
		app.alignShapes('center-vertical')
		jest.advanceTimersByTime(1000)

		app.expectShapeToMatch(
			{ id: ids.boxA, y: 200 },
			{ id: ids.boxB, y: 225 },
			{ id: ids.boxC, y: 200 }
		)
	})

	it('aligns center, when shapes are rotated', () => {
		app.updateShapes([
			{
				id: ids.boxA,
				type: 'geo',
				rotation: PI,
			},
			{
				id: ids.boxB,
				type: 'geo',
				rotation: PI,
			},
			{
				id: ids.boxC,
				type: 'geo',
				rotation: PI,
			},
		])

		app.alignShapes('center-vertical')
		jest.advanceTimersByTime(1000)
		app.alignShapes('center-horizontal')
		jest.advanceTimersByTime(1000)

		const commonBounds = Box2d.Common([
			app.getPageBoundsById(ids.boxA)!,
			app.getPageBoundsById(ids.boxB)!,
			app.getPageBoundsById(ids.boxC)!,
		])

		expect(commonBounds.midX).toBeCloseTo(app.getPageBoundsById(ids.boxA)!.midX, 5)
		expect(commonBounds.midX).toBeCloseTo(app.getPageBoundsById(ids.boxB)!.midX, 5)
		expect(commonBounds.midX).toBeCloseTo(app.getPageBoundsById(ids.boxC)!.midX, 5)

		expect(commonBounds.midY).toBeCloseTo(app.getPageBoundsById(ids.boxA)!.midY, 5)
		expect(commonBounds.midY).toBeCloseTo(app.getPageBoundsById(ids.boxB)!.midY, 5)
		expect(commonBounds.midY).toBeCloseTo(app.getPageBoundsById(ids.boxC)!.midY, 5)
	})

	it('aligns top-left, when shapes are rotated', () => {
		app.updateShapes([
			{
				id: ids.boxA,
				type: 'geo',
				rotation: 0.2,
			},
			{
				id: ids.boxB,
				type: 'geo',
				rotation: 0.4,
			},
			{
				id: ids.boxC,
				type: 'geo',
				rotation: 0.6,
			},
		])

		app.alignShapes('top')
		jest.advanceTimersByTime(1000)
		app.alignShapes('left')
		jest.advanceTimersByTime(1000)

		const commonBounds = Box2d.Common([
			app.getPageBoundsById(ids.boxA)!,
			app.getPageBoundsById(ids.boxB)!,
			app.getPageBoundsById(ids.boxC)!,
		])

		expect(commonBounds.minX).toBeCloseTo(app.getPageBoundsById(ids.boxA)!.minX, 5)
		expect(commonBounds.minX).toBeCloseTo(app.getPageBoundsById(ids.boxB)!.minX, 5)
		expect(commonBounds.minX).toBeCloseTo(app.getPageBoundsById(ids.boxC)!.minX, 5)

		expect(commonBounds.minY).toBeCloseTo(app.getPageBoundsById(ids.boxA)!.minY, 5)
		expect(commonBounds.minY).toBeCloseTo(app.getPageBoundsById(ids.boxB)!.minY, 5)
		expect(commonBounds.minY).toBeCloseTo(app.getPageBoundsById(ids.boxC)!.minY, 5)
	})

	it('aligns bottom-right, when shapes are rotated', () => {
		app.updateShapes([
			{
				id: ids.boxA,
				type: 'geo',
				rotation: 0.2,
			},
			{
				id: ids.boxB,
				type: 'geo',
				rotation: 0.4,
			},
			{
				id: ids.boxC,
				type: 'geo',
				rotation: 0.6,
			},
		])

		app.setSelectedIds([ids.boxA, ids.boxB, ids.boxC])
		app.alignShapes('bottom')
		jest.advanceTimersByTime(1000)
		app.alignShapes('right')
		jest.advanceTimersByTime(1000)

		const commonBounds = Box2d.Common([
			app.getPageBoundsById(ids.boxA)!,
			app.getPageBoundsById(ids.boxC)!,
		])

		expect(commonBounds.maxX).toBeCloseTo(app.getPageBoundsById(ids.boxA)!.maxX, 5)
		expect(commonBounds.maxX).toBeCloseTo(app.getPageBoundsById(ids.boxB)!.maxX, 5)
		expect(commonBounds.maxX).toBeCloseTo(app.getPageBoundsById(ids.boxC)!.maxX, 5)

		expect(commonBounds.maxX).toBeCloseTo(app.getPageBoundsById(ids.boxA)!.maxX, 5)
		expect(commonBounds.maxY).toBeCloseTo(app.getPageBoundsById(ids.boxB)!.maxY, 5)
		expect(commonBounds.maxY).toBeCloseTo(app.getPageBoundsById(ids.boxC)!.maxY, 5)
	})
})

describe('When shapes are parented to other shapes...', () => {
	beforeEach(() => {
		app = new TestEditor()
		app.selectAll()
		app.deleteShapes()
		ids = app.createShapesFromJsx([
			<TL.geo ref="boxA" x={0} y={0} w={100} h={100}>
				<TL.geo ref="boxB" x={100} y={100} w={50} h={50} />
			</TL.geo>,
			<TL.geo ref="boxC" x={400} y={400} w={100} h={100} />,
		])

		app.selectAll()
	})

	it('Aligns to the top left.', () => {
		app.setSelectedIds([ids.boxC, ids.boxB])

		const commonBoundsBefore = Box2d.Common([
			app.getPageBoundsById(ids.boxC)!,
			app.getPageBoundsById(ids.boxB)!,
		])

		app.alignShapes('top')
		jest.advanceTimersByTime(1000)
		app.alignShapes('left')
		jest.advanceTimersByTime(1000)

		const commonBoundsAfter = Box2d.Common([
			app.getPageBoundsById(ids.boxC)!,
			app.getPageBoundsById(ids.boxB)!,
		])

		expect(commonBoundsBefore.minX).toBeCloseTo(commonBoundsAfter.minX)
		expect(commonBoundsBefore.minY).toBeCloseTo(commonBoundsAfter.minY)
	})

	it('Aligns to the bottom right.', () => {
		app.setSelectedIds([ids.boxC, ids.boxB])

		const commonBoundsBefore = Box2d.Common([
			app.getPageBoundsById(ids.boxC)!,
			app.getPageBoundsById(ids.boxB)!,
		])

		app.alignShapes('bottom')
		jest.advanceTimersByTime(1000)
		app.alignShapes('right')
		jest.advanceTimersByTime(1000)

		const commonBoundsAfter = Box2d.Common([
			app.getPageBoundsById(ids.boxC)!,
			app.getPageBoundsById(ids.boxB)!,
		])

		expect(commonBoundsBefore.maxX).toBeCloseTo(commonBoundsAfter.maxX)
		expect(commonBoundsBefore.maxY).toBeCloseTo(commonBoundsAfter.maxY)
	})
})

describe('When shapes are parented to a rotated shape...', () => {
	beforeEach(() => {
		app = new TestEditor()
		app.selectAll()
		app.deleteShapes()
		app.createShapes([
			{
				id: ids.boxA,
				type: 'geo',
				x: 100,
				y: 100,
				props: {
					w: 100,
					h: 100,
				},
				rotation: PI / 2,
			},
			{
				id: ids.boxB,
				type: 'geo',
				parentId: ids.boxA,
				x: 100,
				y: 100,
				props: {
					geo: 'ellipse',
					w: 50,
					h: 50,
				},
			},
			{
				id: ids.boxC,
				type: 'geo',
				x: 400,
				y: 400,
				props: {
					w: 100,
					h: 100,
				},
			},
		])
		app.selectAll()
	})

	it('Aligns to the top left.', () => {
		app.setSelectedIds([ids.boxC, ids.boxB])

		const commonBoundsBefore = Box2d.Common([
			app.getPageBoundsById(ids.boxC)!,
			app.getPageBoundsById(ids.boxB)!,
		])

		app.alignShapes('top')
		jest.advanceTimersByTime(1000)
		app.alignShapes('left')
		jest.advanceTimersByTime(1000)

		const commonBoundsAfter = Box2d.Common([
			app.getPageBoundsById(ids.boxC)!,
			app.getPageBoundsById(ids.boxB)!,
		])

		expect(commonBoundsBefore.minX).toBeCloseTo(commonBoundsAfter.minX)
		expect(commonBoundsBefore.minY).toBeCloseTo(commonBoundsAfter.minY)

		expect(commonBoundsAfter.minX).toBeCloseTo(app.getPageBoundsById(ids.boxB)!.minX, 5)
		expect(commonBoundsAfter.minX).toBeCloseTo(app.getPageBoundsById(ids.boxC)!.minX, 5)

		expect(commonBoundsAfter.minY).toBeCloseTo(app.getPageBoundsById(ids.boxB)!.minY, 5)
		expect(commonBoundsAfter.minY).toBeCloseTo(app.getPageBoundsById(ids.boxC)!.minY, 5)
	})

	it('Aligns to the bottom right.', () => {
		app.setSelectedIds([ids.boxC, ids.boxB])

		const commonBoundsBefore = Box2d.Common([
			app.getPageBoundsById(ids.boxC)!,
			app.getPageBoundsById(ids.boxB)!,
		])

		app.alignShapes('bottom')
		jest.advanceTimersByTime(1000)
		app.alignShapes('right')
		jest.advanceTimersByTime(1000)

		const commonBoundsAfter = Box2d.Common([
			app.getPageBoundsById(ids.boxC)!,
			app.getPageBoundsById(ids.boxB)!,
		])

		expect(commonBoundsBefore.maxX).toBeCloseTo(commonBoundsAfter.maxX)
		expect(commonBoundsBefore.maxY).toBeCloseTo(commonBoundsAfter.maxY)

		expect(commonBoundsAfter.maxX).toBeCloseTo(app.getPageBoundsById(ids.boxB)!.maxX, 5)
		expect(commonBoundsAfter.maxX).toBeCloseTo(app.getPageBoundsById(ids.boxC)!.maxX, 5)

		expect(commonBoundsAfter.maxY).toBeCloseTo(app.getPageBoundsById(ids.boxB)!.maxY, 5)
		expect(commonBoundsAfter.maxY).toBeCloseTo(app.getPageBoundsById(ids.boxC)!.maxY, 5)
	})
})
