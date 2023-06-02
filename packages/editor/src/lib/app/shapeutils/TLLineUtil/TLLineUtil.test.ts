import { createCustomShapeId, TLGeoShape, TLLineShape } from '@tldraw/tlschema'
import { deepCopy } from '@tldraw/utils'
import { TestEditor } from '../../../test/TestEditor'

jest.mock('nanoid', () => {
	let i = 0
	return { nanoid: () => 'id' + i++ }
})

let app: TestEditor
const id = createCustomShapeId('line1')

jest.useFakeTimers()

beforeEach(() => {
	app = new TestEditor()
	app
		.selectAll()
		.deleteShapes()
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
		app.select(id)
		app.pointerDown(25, 25, { target: 'shape', shape: app.getShapeById<TLLineShape>(id) })
		app.pointerMove(50, 50) // Move shape by 25, 25
		app.expectShapeToMatch({
			id: id,
			x: 175,
			y: 175,
		})
	})

	it('updates the line when rotated', () => {
		app.select(id)

		const shape = app.getShapeById<TLLineShape>(id)!
		shape.rotation = Math.PI / 2

		app.pointerDown(250, 250, { target: 'shape', shape: shape })
		app.pointerMove(300, 400) // Move shape by 50, 150

		app.expectShapeToMatch({
			id: id,
			x: 200,
			y: 300,
		})
	})
})

it('create new handle', () => {
	app.select(id)

	const shape = app.getShapeById<TLLineShape>(id)!
	app.pointerDown(200, 200, {
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
	app.pointerMove(349, 349).pointerMove(350, 350) // Move handle by 150, 150
	app.pointerUp()

	app.expectShapeToMatch({
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
		app.select(id)
		const shape = app.getShapeById<TLLineShape>(id)!
		const prevHandles = deepCopy(shape.props.handles)

		app.updateShapes([
			{
				...shape,
				props: {
					spline: 'cubic',
				},
			},
		])

		app.expectShapeToMatch({
			id,
			props: {
				spline: 'cubic',
				handles: prevHandles,
			},
		})
	})

	it('resizes', () => {
		app.select(id)
		app.getShapeById<TLLineShape>(id)!

		app
			.pointerDown(150, 0, { target: 'selection', handle: 'bottom' })
			.pointerMove(150, 600) // Resize shape by 0, 600
			.expectPathToBe('root.select.resizing')

		expect(app.getShapeById(id)!).toMatchSnapshot('line shape after resize')
	})

	it('nudges', () => {
		app.select(id)
		app.nudgeShapes(app.selectedIds, { x: 1, y: 0 })

		app.expectShapeToMatch({
			id: id,
			x: 151,
			y: 150,
		})

		app.nudgeShapes(app.selectedIds, { x: 0, y: 1 }, true)

		app.expectShapeToMatch({
			id: id,
			x: 151,
			y: 160,
		})
	})

	it('align', () => {
		const boxID = createCustomShapeId('box1')
		app.createShapes([{ id: boxID, type: 'geo', x: 500, y: 150, props: { w: 100, h: 50 } }])

		const box = app.getShapeById<TLGeoShape>(boxID)!
		const line = app.getShapeById<TLLineShape>(id)!

		app.select(boxID, id)

		expect(app.getPageBounds(box)!.maxX).not.toEqual(app.getPageBounds(line)!.maxX)
		app.alignShapes('right', app.selectedIds)
		jest.advanceTimersByTime(1000)
		expect(app.getPageBounds(box)!.maxX).toEqual(app.getPageBounds(line)!.maxX)

		expect(app.getPageBounds(box)!.maxY).not.toEqual(app.getPageBounds(line)!.maxY)
		app.alignShapes('bottom', app.selectedIds)
		jest.advanceTimersByTime(1000)
		expect(app.getPageBounds(box)!.maxY).toEqual(app.getPageBounds(line)!.maxY)
	})

	it('duplicates', () => {
		app.select(id)

		app
			.keyDown('Alt')
			.pointerDown(25, 25, { target: 'shape', shape: app.getShapeById<TLLineShape>(id) })
		app.pointerMove(50, 50) // Move shape by 25, 25
		app.pointerUp().keyUp('Alt')

		expect(Array.from(app.shapeIds.values()).length).toEqual(2)
	})

	it('deletes', () => {
		app.select(id)

		app
			.keyDown('Alt')
			.pointerDown(25, 25, { target: 'shape', shape: app.getShapeById<TLLineShape>(id) })
		app.pointerMove(50, 50) // Move shape by 25, 25
		app.pointerUp().keyUp('Alt')

		let ids = Array.from(app.shapeIds.values())
		expect(ids.length).toEqual(2)

		const duplicate = ids.filter((i) => i !== id)[0]
		app.select(duplicate)

		app.deleteShapes()

		ids = Array.from(app.shapeIds.values())
		expect(ids.length).toEqual(1)
		expect(ids[0]).toEqual(id)
	})
})
