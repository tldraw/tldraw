import {
	IndexKey,
	TLGeoShape,
	TLLineShape,
	createShapeId,
	mockUniqueId,
	sortByIndex,
	structuredClone,
} from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from '../../../test/TestEditor'

let nextId = 0
mockUniqueId(() => 'id' + nextId++)

let editor: TestEditor
const id = createShapeId('line1')

vi.useFakeTimers()

beforeEach(() => {
	editor = new TestEditor()
	editor
		.selectAll()
		.deleteShapes(editor.getSelectedShapeIds())
		.createShapes([
			{
				id: id,
				type: 'line',
				x: 150,
				y: 150,
				props: {
					points: {
						a1: { id: 'a1', index: 'a1' as IndexKey, x: 0, y: 0 },
						a2: { id: 'a2', index: 'a2' as IndexKey, x: 100, y: 100 },
					},
				},
			},
		])
})

const getShape = () => editor.getShape<TLLineShape>(id)!
const getHandles = () => editor.getShapeHandles<TLLineShape>(id)!

describe('Translating', () => {
	it('updates the line', () => {
		editor.select(id)
		editor.pointerDown(25, 25, { target: 'shape', shape: getShape() })
		editor.pointerMove(50, 50) // Move shape by 25, 25
		editor.expectShapeToMatch<TLLineShape>({
			id: id,
			x: 175,
			y: 175,
		})
	})

	it('updates the line when rotated', () => {
		editor.select(id)

		const shape = getShape()
		editor.updateShape({ ...shape, rotation: Math.PI / 2 })

		editor.pointerDown(250, 250, { target: 'shape', shape: shape })
		editor.pointerMove(300, 400) // Move shape by 50, 150

		editor.expectShapeToMatch<TLLineShape>({
			id: id,
			x: 200,
			y: 300,
		})
	})
})

describe('Mid-point handles', () => {
	it('create new handle', () => {
		editor.select(id)

		editor.pointerDown(200, 200, {
			target: 'handle',
			shape: getShape(),
			handle: getHandles()[1],
		})
		editor.pointerMove(349, 349).pointerMove(350, 350) // Move handle by 150, 150
		editor.pointerUp()

		editor.expectShapeToMatch({
			id: id,
			props: {
				points: {
					a1: { id: 'a1', index: 'a1', x: 0, y: 0 },
					a1V: { id: 'a1V', index: 'a1V', x: 200, y: 200 },
					a2: { id: 'a2', index: 'a2', x: 100, y: 100 },
				},
			},
		})
	})

	it('allows snapping with mid-point handles', () => {
		editor.createShapes([
			{ id: createShapeId(), type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } },
		])

		editor.select(id)

		editor
			.pointerDown(200, 200, {
				target: 'handle',
				shape: getShape(),
				handle: getHandles()[1],
			})
			.pointerMove(198, 230, undefined, { ctrlKey: true })

		expect(editor.snaps.getIndicators()).toHaveLength(1)
		expect(editor.getShapeHandles(id)).toHaveLength(5) // 3 real + 2
		const points = editor.getShape<TLLineShape>(id)!.props.points
		expect(points).toStrictEqual({
			a1: { id: 'a1', index: 'a1', x: 0, y: 0 },
			a1V: { id: 'a1V', index: 'a1V', x: 50, y: 80 },
			a2: { id: 'a2', index: 'a2', x: 100, y: 100 },
		})
	})

	it('allows snapping with created mid-point handles', () => {
		editor.createShapes([
			{ id: createShapeId(), type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } },
		])

		// 2 actual points, plus 1 mid-points:
		expect(getHandles()).toHaveLength(3)

		// use a mid-point handle to create a new handle
		editor
			.select(id)
			.pointerDown(200, 200, {
				target: 'handle',
				shape: getShape(),
				handle: getHandles().sort(sortByIndex)[1]!,
			})
			.pointerMove(230, 200)
			.pointerMove(240, 200)
			.pointerMove(200, 200)
			.pointerUp()

		// 3 actual points, plus 2 mid-points:
		expect(getHandles()).toHaveLength(5)

		// now, try dragging the newly created handle. it should still snap:
		editor
			.pointerDown(200, 200, {
				target: 'handle',
				shape: getShape(),
				handle: getHandles().sort(sortByIndex)[2],
			})
			.pointerMove(198, 230, undefined, { ctrlKey: true })

		expect(editor.snaps.getIndicators()).toHaveLength(1)
		expect(editor.getShapeHandles(id)).toHaveLength(5) // 3 real + 2
		const points = editor.getShape<TLLineShape>(id)!.props.points
		expect(points).toStrictEqual({
			a1: { id: 'a1', index: 'a1', x: 0, y: 0 },
			a1V: { id: 'a1V', index: 'a1V', x: 50, y: 80 },
			a2: { id: 'a2', index: 'a2', x: 100, y: 100 },
		})
	})
})

describe('Snapping', () => {
	beforeEach(() => {
		editor.updateShape({
			id: id,
			type: 'line',
			props: {
				points: {
					a1: { id: 'a1', index: 'a1' as IndexKey, x: 0, y: 0 },
					a2: { id: 'a2', index: 'a2' as IndexKey, x: 100, y: 0 },
					a3: { id: 'a3', index: 'a3' as IndexKey, x: 100, y: 100 },
					a4: { id: 'a4', index: 'a4' as IndexKey, x: 0, y: 100 },
				},
			},
		})
	})

	it('snaps endpoints to itself', () => {
		editor.select(id)

		editor
			.pointerDown(0, 0, { target: 'handle', shape: getShape(), handle: getHandles()[0] })
			.pointerMove(50, 95, undefined, { ctrlKey: true })

		expect(editor.snaps.getIndicators()).toHaveLength(1)
		editor.expectShapeToMatch({
			id: id,
			props: {
				points: {
					a1: { id: 'a1', index: 'a1', x: 50, y: 100 },
					a2: { id: 'a2', index: 'a2', x: 100, y: 0 },
					a3: { id: 'a3', index: 'a3', x: 100, y: 100 },
					a4: { id: 'a4', index: 'a4', x: 0, y: 100 },
				},
			},
		})
	})

	it('snaps endpoints to its vertices', () => {
		editor.select(id)

		editor
			.pointerDown(0, 0, { target: 'handle', shape: getShape(), handle: getHandles()[0] })
			.pointerMove(3, 95, undefined, { ctrlKey: true })

		expect(editor.snaps.getIndicators()).toHaveLength(1)
		editor.expectShapeToMatch({
			id: id,
			props: {
				points: {
					a1: { id: 'a1', index: 'a1', x: 0, y: 100 },
					a2: { id: 'a2', index: 'a2', x: 100, y: 0 },
					a3: { id: 'a3', index: 'a3', x: 100, y: 100 },
					a4: { id: 'a4', index: 'a4', x: 0, y: 100 },
				},
			},
		})
	})

	it("doesn't snap to the segment of the current handle", () => {
		editor.select(id)

		editor
			.pointerDown(0, 0, { target: 'handle', shape: getShape(), handle: getHandles()[0] })
			.pointerMove(5, 2, undefined, { ctrlKey: true })

		expect(editor.snaps.getIndicators()).toHaveLength(0)
		editor.expectShapeToMatch({
			id: id,
			props: {
				points: {
					a1: { id: 'a1', index: 'a1', x: 5, y: 2 },
					a2: { id: 'a2', index: 'a2', x: 100, y: 0 },
					a3: { id: 'a3', index: 'a3', x: 100, y: 100 },
					a4: { id: 'a4', index: 'a4', x: 0, y: 100 },
				},
			},
		})
	})

	it('snaps to vertices on other line shapes', () => {
		editor.createShapes([
			{
				id: createShapeId(),
				type: 'line',
				x: 150,
				y: 150,
				props: {
					points: {
						a1: { id: 'a1', index: 'a1' as IndexKey, x: 200, y: 0 },
						a2: { id: 'a2', index: 'a2' as IndexKey, x: 300, y: 0 },
					},
				},
			},
		])

		editor.select(id)

		const handle = getHandles()[0]
		editor
			.pointerDown(handle.x, handle.y, { target: 'handle', shape: getShape(), handle })
			.pointerMove(205, 1, undefined, { ctrlKey: true })

		expect(editor.snaps.getIndicators()).toHaveLength(1)
		editor.expectShapeToMatch({
			id: id,
			props: {
				points: {
					a1: { id: 'a1', index: 'a1', x: 200, y: 0 },
					a2: { id: 'a2', index: 'a2', x: 100, y: 0 },
					a3: { id: 'a3', index: 'a3', x: 100, y: 100 },
					a4: { id: 'a4', index: 'a4', x: 0, y: 100 },
				},
			},
		})
	})
})

describe('Misc', () => {
	it('preserves handle positions on spline type change', () => {
		editor.select(id)
		const shape = getShape()
		const prevPoints = structuredClone(shape.props.points)

		editor.updateShapes([
			{
				...shape,
				props: {
					spline: 'cubic',
				},
			},
		])

		editor.expectShapeToMatch<TLLineShape>({
			id,
			props: {
				spline: 'cubic',
				points: prevPoints,
			},
		})
	})

	it('resizes', () => {
		editor.select(id)

		editor
			.pointerDown(150, 0, { target: 'selection', handle: 'bottom' })
			.pointerMove(150, 600) // Resize shape by 0, 600
			.expectToBeIn('select.resizing')

		expect(editor.getShape(id)!).toMatchSnapshot('line shape after resize')
	})

	it('nudges', () => {
		editor.select(id)
		editor.nudgeShapes(editor.getSelectedShapeIds(), { x: 1, y: 0 })

		editor.expectShapeToMatch<TLLineShape>({
			id: id,
			x: 151,
			y: 150,
		})

		editor.nudgeShapes(editor.getSelectedShapeIds(), { x: 0, y: 10 })

		editor.expectShapeToMatch<TLLineShape>({
			id: id,
			x: 151,
			y: 160,
		})
	})

	it('align', () => {
		const boxID = createShapeId('box1')
		editor.createShapes([{ id: boxID, type: 'geo', x: 500, y: 150, props: { w: 100, h: 50 } }])

		const box = editor.getShape<TLGeoShape>(boxID)!
		const line = getShape()

		editor.select(boxID, id)

		expect(editor.getShapePageBounds(box)!.maxX).not.toEqual(editor.getShapePageBounds(line)!.maxX)
		editor.alignShapes(editor.getSelectedShapeIds(), 'right')
		vi.advanceTimersByTime(1000)
		expect(editor.getShapePageBounds(box)!.maxX).toEqual(editor.getShapePageBounds(line)!.maxX)

		expect(editor.getShapePageBounds(box)!.maxY).not.toEqual(editor.getShapePageBounds(line)!.maxY)
		editor.alignShapes(editor.getSelectedShapeIds(), 'bottom')
		vi.advanceTimersByTime(1000)
		expect(editor.getShapePageBounds(box)!.maxY).toEqual(editor.getShapePageBounds(line)!.maxY)
	})

	it('duplicates', () => {
		editor.select(id)

		editor.keyDown('Alt').pointerDown(25, 25, { target: 'shape', shape: getShape() })
		editor.pointerMove(50, 50) // Move shape by 25, 25
		editor.pointerUp().keyUp('Alt')

		expect(Array.from(editor.getCurrentPageShapeIds().values()).length).toEqual(2)
	})

	it('deletes', () => {
		editor.select(id)

		editor.keyDown('Alt').pointerDown(25, 25, { target: 'shape', shape: getShape() })
		editor.pointerMove(50, 50) // Move shape by 25, 25
		editor.pointerUp().keyUp('Alt')

		let ids = Array.from(editor.getCurrentPageShapeIds().values())
		expect(ids.length).toEqual(2)

		const duplicate = ids.filter((i) => i !== id)[0]
		editor.select(duplicate)

		editor.deleteShapes(editor.getSelectedShapeIds())

		ids = Array.from(editor.getCurrentPageShapeIds().values())
		expect(ids.length).toEqual(1)
		expect(ids[0]).toEqual(id)
	})
})

describe('Points keyed differently from their indices', () => {
	// The points map allows any string keys, and they need not match each point's
	// `index`. Dragging a vertex handle on such a line used to insert a new point
	// keyed by the handle id (the index), producing two points that share an index
	// and crashing getHandles() via fractional indexing ("a2 >= a2"). See #9267.
	const mismatchedId = createShapeId('line-mismatched')

	it('updates the dragged point in place instead of duplicating its index', () => {
		editor.createShapes([
			{
				id: mismatchedId,
				type: 'line',
				x: 100,
				y: 100,
				props: {
					points: {
						a: { id: 'a', index: 'a1' as IndexKey, x: 0, y: 0 },
						b: { id: 'b', index: 'a2' as IndexKey, x: 100, y: 0 },
					},
				},
			},
		])
		editor.select(mismatchedId)

		// the endpoint handle's id is its index ('a2'), which differs from its key ('b')
		const endHandle = getHandlesFor(mismatchedId).find((h) => h.id === 'a2')!
		const inParent = editor.getShapePageTransform(mismatchedId)!.applyToPoint(endHandle)

		editor
			.pointerMove(inParent.x, inParent.y)
			.pointerDown(inParent.x, inParent.y, {
				target: 'handle',
				shape: editor.getShape(mismatchedId),
				handle: endHandle,
			})
			.pointerMove(inParent.x + 100, inParent.y)
			.pointerUp()

		// still exactly two points, keyed as before — no duplicate index introduced
		expect(editor.getShape<TLLineShape>(mismatchedId)!.props.points).toStrictEqual({
			a: { id: 'a', index: 'a1', x: 0, y: 0 },
			b: { id: 'b', index: 'a2', x: 200, y: 0 },
		})

		// recomputing handles must not throw
		expect(() => editor.getShapeHandles(mismatchedId)).not.toThrow()
	})

	it('tolerates a line that already has a duplicate index without crashing', () => {
		// Malformed data: points 'b' and 'a2' share index 'a2'. This used to throw
		// "a2 >= a2" from getHandles via getIndexBetween, crashing on render.
		const corruptId = createShapeId('line-corrupt')
		editor.createShapes([
			{
				id: corruptId,
				type: 'line',
				x: 100,
				y: 100,
				props: {
					points: {
						a: { id: 'a', index: 'a1' as IndexKey, x: 0, y: 0 },
						b: { id: 'b', index: 'a2' as IndexKey, x: 100, y: 0 },
						a2: { id: 'a2', index: 'a2' as IndexKey, x: 200, y: 0 },
					},
				},
			},
		])

		expect(() => editor.getShapeHandles(corruptId)).not.toThrow()
		// the duplicate index is collapsed to a single vertex
		const vertexHandles = getHandlesFor(corruptId).filter((h) => h.type === 'vertex')
		expect(vertexHandles.map((h) => h.id)).toEqual(['a1', 'a2'])
	})
})

function getHandlesFor(shapeId: TLLineShape['id']) {
	return editor.getShapeHandles<TLLineShape>(shapeId)!
}
