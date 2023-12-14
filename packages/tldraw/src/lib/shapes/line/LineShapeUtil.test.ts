import { TLGeoShape, TLLineShape, createShapeId, deepCopy } from '@tldraw/editor'
import { TestEditor } from '../../../test/TestEditor'

jest.mock('nanoid', () => {
	let i = 0
	return { nanoid: () => 'id' + i++ }
})

let editor: TestEditor
const id = createShapeId('line1')

jest.useFakeTimers()

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
					handles: {
						start: {
							id: 'start',
							type: 'vertex',
							canBind: false,
							index: 'a1',
							x: 0,
							y: 0,
						},
						end: {
							id: 'end',
							type: 'vertex',
							canBind: false,
							index: 'a2',
							x: 100,
							y: 100,
						},
					},
				},
			},
		])
})

describe('Translating', () => {
	it('updates the line', () => {
		editor.select(id)
		editor.pointerDown(25, 25, { target: 'shape', shape: editor.getShape<TLLineShape>(id) })
		editor.pointerMove(50, 50) // Move shape by 25, 25
		editor.expectShapeToMatch({
			id: id,
			x: 175,
			y: 175,
		})
	})

	it('updates the line when rotated', () => {
		editor.select(id)

		const shape = editor.getShape<TLLineShape>(id)!
		shape.rotation = Math.PI / 2

		editor.pointerDown(250, 250, { target: 'shape', shape: shape })
		editor.pointerMove(300, 400) // Move shape by 50, 150

		editor.expectShapeToMatch({
			id: id,
			x: 200,
			y: 300,
		})
	})
})

it('create new handle', () => {
	editor.select(id)

	const shape = editor.getShape<TLLineShape>(id)!
	editor.pointerDown(200, 200, {
		target: 'handle',
		shape,
		handle: {
			id: 'mid-0',
			type: 'create',
			index: 'a1V',
			x: 50,
			y: 50,
		},
	})
	editor.pointerMove(349, 349).pointerMove(350, 350) // Move handle by 150, 150
	editor.pointerUp()

	editor.expectShapeToMatch({
		id: id,
		props: {
			handles: {
				...shape.props.handles,
				'handle:a1V': {
					id: 'handle:a1V',
					type: 'vertex',
					canBind: false,
					index: 'a1V',
					x: 200,
					y: 200,
				},
			},
		},
	})
})

describe('Misc', () => {
	it('preserves handle positions on spline type change', () => {
		editor.select(id)
		const shape = editor.getShape<TLLineShape>(id)!
		const prevHandles = deepCopy(shape.props.handles)

		editor.updateShapes([
			{
				...shape,
				props: {
					spline: 'cubic',
				},
			},
		])

		editor.expectShapeToMatch({
			id,
			props: {
				spline: 'cubic',
				handles: prevHandles,
			},
		})
	})

	it('resizes', () => {
		editor.select(id)
		editor.getShape<TLLineShape>(id)!

		editor
			.pointerDown(150, 0, { target: 'selection', handle: 'bottom' })
			.pointerMove(150, 600) // Resize shape by 0, 600
			.expectToBeIn('select.resizing')

		expect(editor.getShape(id)!).toMatchSnapshot('line shape after resize')
	})

	it('nudges', () => {
		editor.select(id)
		editor.nudgeShapes(editor.getSelectedShapeIds(), { x: 1, y: 0 })

		editor.expectShapeToMatch({
			id: id,
			x: 151,
			y: 150,
		})

		editor.nudgeShapes(editor.getSelectedShapeIds(), { x: 0, y: 10 })

		editor.expectShapeToMatch({
			id: id,
			x: 151,
			y: 160,
		})
	})

	it('align', () => {
		const boxID = createShapeId('box1')
		editor.createShapes([{ id: boxID, type: 'geo', x: 500, y: 150, props: { w: 100, h: 50 } }])

		const box = editor.getShape<TLGeoShape>(boxID)!
		const line = editor.getShape<TLLineShape>(id)!

		editor.select(boxID, id)

		expect(editor.getShapePageBounds(box)!.maxX).not.toEqual(editor.getShapePageBounds(line)!.maxX)
		editor.alignShapes(editor.getSelectedShapeIds(), 'right')
		jest.advanceTimersByTime(1000)
		expect(editor.getShapePageBounds(box)!.maxX).toEqual(editor.getShapePageBounds(line)!.maxX)

		expect(editor.getShapePageBounds(box)!.maxY).not.toEqual(editor.getShapePageBounds(line)!.maxY)
		editor.alignShapes(editor.getSelectedShapeIds(), 'bottom')
		jest.advanceTimersByTime(1000)
		expect(editor.getShapePageBounds(box)!.maxY).toEqual(editor.getShapePageBounds(line)!.maxY)
	})

	it('duplicates', () => {
		editor.select(id)

		editor
			.keyDown('Alt')
			.pointerDown(25, 25, { target: 'shape', shape: editor.getShape<TLLineShape>(id) })
		editor.pointerMove(50, 50) // Move shape by 25, 25
		editor.pointerUp().keyUp('Alt')

		expect(Array.from(editor.getCurrentPageShapeIds().values()).length).toEqual(2)
	})

	it('deletes', () => {
		editor.select(id)

		editor
			.keyDown('Alt')
			.pointerDown(25, 25, { target: 'shape', shape: editor.getShape<TLLineShape>(id) })
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
