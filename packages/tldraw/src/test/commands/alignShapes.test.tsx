import { Box2d, PI, TLShapeId } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'
import { TL } from '../test-jsx'

let editor: TestEditor
let ids: Record<string, TLShapeId>

jest.useFakeTimers()

beforeEach(() => {
	editor = new TestEditor()
	ids = editor.createShapesFromJsx([
		<TL.geo ref="boxA" x={0} y={0} w={100} h={100} />,
		<TL.geo ref="boxB" x={100} y={100} w={50} h={50} />,
		<TL.geo ref="boxC" x={400} y={400} w={100} h={100} />,
	])

	editor.selectAll()
})

describe('when less than two shapes are selected', () => {
	it('does nothing', () => {
		editor.setSelectedShapes([ids.boxB])

		const fn = jest.fn()
		editor.on('update', fn)
		editor.alignShapes(editor.selectedShapeIds, 'top')
		jest.advanceTimersByTime(1000)
		expect(fn).not.toHaveBeenCalled()
	})
})

describe('when multiple shapes are selected', () => {
	it('does, undoes and redoes command', () => {
		editor.mark('align')
		editor.alignShapes(editor.selectedShapeIds, 'top')
		jest.advanceTimersByTime(1000)

		editor.expectShapeToMatch({ id: ids.boxB, y: 0 })
		editor.undo()
		editor.expectShapeToMatch({ id: ids.boxB, y: 100 })
		editor.redo()
		editor.expectShapeToMatch({ id: ids.boxB, y: 0 })
	})

	it('aligns top', () => {
		editor.alignShapes(editor.selectedShapeIds, 'top')
		jest.advanceTimersByTime(1000)

		editor.expectShapeToMatch(
			{ id: ids.boxA, y: 0 },
			{ id: ids.boxB, y: 0 },
			{ id: ids.boxC, y: 0 }
		)
	})

	it('aligns right', () => {
		editor.alignShapes(editor.selectedShapeIds, 'right')
		jest.advanceTimersByTime(1000)

		editor.expectShapeToMatch(
			{ id: ids.boxA, x: 400 },
			{ id: ids.boxB, x: 450 },
			{ id: ids.boxC, x: 400 }
		)
	})

	it('aligns bottom', () => {
		editor.alignShapes(editor.selectedShapeIds, 'bottom')
		jest.advanceTimersByTime(1000)

		editor.expectShapeToMatch(
			{ id: ids.boxA, y: 400 },
			{ id: ids.boxB, y: 450 },
			{ id: ids.boxC, y: 400 }
		)
	})

	it('aligns left', () => {
		editor.alignShapes(editor.selectedShapeIds, 'left')
		jest.advanceTimersByTime(1000)

		editor.expectShapeToMatch(
			{ id: ids.boxA, x: 0 },
			{ id: ids.boxB, x: 0 },
			{ id: ids.boxC, x: 0 }
		)
	})

	it('aligns center horizontal', () => {
		editor.alignShapes(editor.selectedShapeIds, 'center-horizontal')
		jest.advanceTimersByTime(1000)

		editor.expectShapeToMatch(
			{ id: ids.boxA, x: 200 },
			{ id: ids.boxB, x: 225 },
			{ id: ids.boxC, x: 200 }
		)
	})

	it('aligns center vertical', () => {
		editor.alignShapes(editor.selectedShapeIds, 'center-vertical')
		jest.advanceTimersByTime(1000)

		editor.expectShapeToMatch(
			{ id: ids.boxA, y: 200 },
			{ id: ids.boxB, y: 225 },
			{ id: ids.boxC, y: 200 }
		)
	})

	it('aligns center, when shapes are rotated', () => {
		editor.updateShapes([
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

		editor.alignShapes(editor.selectedShapeIds, 'center-vertical')
		jest.advanceTimersByTime(1000)
		editor.alignShapes(editor.selectedShapeIds, 'center-horizontal')
		jest.advanceTimersByTime(1000)

		const commonBounds = Box2d.Common([
			editor.getShapePageBounds(ids.boxA)!,
			editor.getShapePageBounds(ids.boxB)!,
			editor.getShapePageBounds(ids.boxC)!,
		])

		expect(commonBounds.midX).toBeCloseTo(editor.getShapePageBounds(ids.boxA)!.midX, 5)
		expect(commonBounds.midX).toBeCloseTo(editor.getShapePageBounds(ids.boxB)!.midX, 5)
		expect(commonBounds.midX).toBeCloseTo(editor.getShapePageBounds(ids.boxC)!.midX, 5)

		expect(commonBounds.midY).toBeCloseTo(editor.getShapePageBounds(ids.boxA)!.midY, 5)
		expect(commonBounds.midY).toBeCloseTo(editor.getShapePageBounds(ids.boxB)!.midY, 5)
		expect(commonBounds.midY).toBeCloseTo(editor.getShapePageBounds(ids.boxC)!.midY, 5)
	})

	it('aligns top-left, when shapes are rotated', () => {
		editor.updateShapes([
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

		editor.alignShapes(editor.selectedShapeIds, 'top')
		jest.advanceTimersByTime(1000)
		editor.alignShapes(editor.selectedShapeIds, 'left')
		jest.advanceTimersByTime(1000)

		const commonBounds = Box2d.Common([
			editor.getShapePageBounds(ids.boxA)!,
			editor.getShapePageBounds(ids.boxB)!,
			editor.getShapePageBounds(ids.boxC)!,
		])

		expect(commonBounds.minX).toBeCloseTo(editor.getShapePageBounds(ids.boxA)!.minX, 5)
		expect(commonBounds.minX).toBeCloseTo(editor.getShapePageBounds(ids.boxB)!.minX, 5)
		expect(commonBounds.minX).toBeCloseTo(editor.getShapePageBounds(ids.boxC)!.minX, 5)

		expect(commonBounds.minY).toBeCloseTo(editor.getShapePageBounds(ids.boxA)!.minY, 5)
		expect(commonBounds.minY).toBeCloseTo(editor.getShapePageBounds(ids.boxB)!.minY, 5)
		expect(commonBounds.minY).toBeCloseTo(editor.getShapePageBounds(ids.boxC)!.minY, 5)
	})

	it('aligns bottom-right, when shapes are rotated', () => {
		editor.updateShapes([
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

		editor.setSelectedShapes([ids.boxA, ids.boxB, ids.boxC])
		editor.alignShapes(editor.selectedShapeIds, 'bottom')
		jest.advanceTimersByTime(1000)
		editor.alignShapes(editor.selectedShapeIds, 'right')
		jest.advanceTimersByTime(1000)

		const commonBounds = Box2d.Common([
			editor.getShapePageBounds(ids.boxA)!,
			editor.getShapePageBounds(ids.boxC)!,
		])

		expect(commonBounds.maxX).toBeCloseTo(editor.getShapePageBounds(ids.boxA)!.maxX, 5)
		expect(commonBounds.maxX).toBeCloseTo(editor.getShapePageBounds(ids.boxB)!.maxX, 5)
		expect(commonBounds.maxX).toBeCloseTo(editor.getShapePageBounds(ids.boxC)!.maxX, 5)

		expect(commonBounds.maxX).toBeCloseTo(editor.getShapePageBounds(ids.boxA)!.maxX, 5)
		expect(commonBounds.maxY).toBeCloseTo(editor.getShapePageBounds(ids.boxB)!.maxY, 5)
		expect(commonBounds.maxY).toBeCloseTo(editor.getShapePageBounds(ids.boxC)!.maxY, 5)
	})
})

describe('When shapes are parented to other shapes...', () => {
	beforeEach(() => {
		editor = new TestEditor()
		editor.selectAll()
		editor.deleteShapes(editor.selectedShapeIds)
		ids = editor.createShapesFromJsx([
			<TL.geo ref="boxA" x={0} y={0} w={100} h={100}>
				<TL.geo ref="boxB" x={100} y={100} w={50} h={50} />
			</TL.geo>,
			<TL.geo ref="boxC" x={400} y={400} w={100} h={100} />,
		])

		editor.selectAll()
	})

	it('Aligns to the top left.', () => {
		editor.setSelectedShapes([ids.boxC, ids.boxB])

		const commonBoundsBefore = Box2d.Common([
			editor.getShapePageBounds(ids.boxC)!,
			editor.getShapePageBounds(ids.boxB)!,
		])

		editor.alignShapes(editor.selectedShapeIds, 'top')
		jest.advanceTimersByTime(1000)
		editor.alignShapes(editor.selectedShapeIds, 'left')
		jest.advanceTimersByTime(1000)

		const commonBoundsAfter = Box2d.Common([
			editor.getShapePageBounds(ids.boxC)!,
			editor.getShapePageBounds(ids.boxB)!,
		])

		expect(commonBoundsBefore.minX).toBeCloseTo(commonBoundsAfter.minX)
		expect(commonBoundsBefore.minY).toBeCloseTo(commonBoundsAfter.minY)
	})

	it('Aligns to the bottom right.', () => {
		editor.setSelectedShapes([ids.boxC, ids.boxB])

		const commonBoundsBefore = Box2d.Common([
			editor.getShapePageBounds(ids.boxC)!,
			editor.getShapePageBounds(ids.boxB)!,
		])

		editor.alignShapes(editor.selectedShapeIds, 'bottom')
		jest.advanceTimersByTime(1000)
		editor.alignShapes(editor.selectedShapeIds, 'right')
		jest.advanceTimersByTime(1000)

		const commonBoundsAfter = Box2d.Common([
			editor.getShapePageBounds(ids.boxC)!,
			editor.getShapePageBounds(ids.boxB)!,
		])

		expect(commonBoundsBefore.maxX).toBeCloseTo(commonBoundsAfter.maxX)
		expect(commonBoundsBefore.maxY).toBeCloseTo(commonBoundsAfter.maxY)
	})
})

describe('When shapes are parented to a rotated shape...', () => {
	beforeEach(() => {
		editor = new TestEditor()
		editor.selectAll()
		editor.deleteShapes(editor.selectedShapeIds)
		editor.createShapes([
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
		editor.selectAll()
	})

	it('Aligns to the top left.', () => {
		editor.setSelectedShapes([ids.boxC, ids.boxB])

		const commonBoundsBefore = Box2d.Common([
			editor.getShapePageBounds(ids.boxC)!,
			editor.getShapePageBounds(ids.boxB)!,
		])

		editor.alignShapes(editor.selectedShapeIds, 'top')
		jest.advanceTimersByTime(1000)
		editor.alignShapes(editor.selectedShapeIds, 'left')
		jest.advanceTimersByTime(1000)

		const commonBoundsAfter = Box2d.Common([
			editor.getShapePageBounds(ids.boxC)!,
			editor.getShapePageBounds(ids.boxB)!,
		])

		expect(commonBoundsBefore.minX).toBeCloseTo(commonBoundsAfter.minX)
		expect(commonBoundsBefore.minY).toBeCloseTo(commonBoundsAfter.minY)

		expect(commonBoundsAfter.minX).toBeCloseTo(editor.getShapePageBounds(ids.boxB)!.minX, 5)
		expect(commonBoundsAfter.minX).toBeCloseTo(editor.getShapePageBounds(ids.boxC)!.minX, 5)

		expect(commonBoundsAfter.minY).toBeCloseTo(editor.getShapePageBounds(ids.boxB)!.minY, 5)
		expect(commonBoundsAfter.minY).toBeCloseTo(editor.getShapePageBounds(ids.boxC)!.minY, 5)
	})

	it('Aligns to the bottom right.', () => {
		editor.setSelectedShapes([ids.boxC, ids.boxB])

		const commonBoundsBefore = Box2d.Common([
			editor.getShapePageBounds(ids.boxC)!,
			editor.getShapePageBounds(ids.boxB)!,
		])

		editor.alignShapes(editor.selectedShapeIds, 'bottom')
		jest.advanceTimersByTime(1000)
		editor.alignShapes(editor.selectedShapeIds, 'right')
		jest.advanceTimersByTime(1000)

		const commonBoundsAfter = Box2d.Common([
			editor.getShapePageBounds(ids.boxC)!,
			editor.getShapePageBounds(ids.boxB)!,
		])

		expect(commonBoundsBefore.maxX).toBeCloseTo(commonBoundsAfter.maxX)
		expect(commonBoundsBefore.maxY).toBeCloseTo(commonBoundsAfter.maxY)

		expect(commonBoundsAfter.maxX).toBeCloseTo(editor.getShapePageBounds(ids.boxB)!.maxX, 5)
		expect(commonBoundsAfter.maxX).toBeCloseTo(editor.getShapePageBounds(ids.boxC)!.maxX, 5)

		expect(commonBoundsAfter.maxY).toBeCloseTo(editor.getShapePageBounds(ids.boxB)!.maxY, 5)
		expect(commonBoundsAfter.maxY).toBeCloseTo(editor.getShapePageBounds(ids.boxC)!.maxY, 5)
	})
})
