import { createCustomShapeId } from '@tldraw/tlschema'
import { TestEditor } from '../TestEditor'

let app: TestEditor

const ids = {
	box1: createCustomShapeId('box1'),
	embed1: createCustomShapeId('embed1'),
}

jest.useFakeTimers()

beforeEach(() => {
	app = new TestEditor()
	app
		.selectAll()
		.deleteShapes()
		.createShapes([{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])
})

describe('TLSelectTool.Translating', () => {
	it('Enters from pointing and exits to idle', () => {
		const shape = app.getShapeById(ids.box1)
		app.pointerDown(150, 150, { target: 'shape', shape })
		app.expectToBeIn('select.pointing_shape')

		app.pointerMove(200, 200)
		app.expectToBeIn('select.translating')

		app.pointerUp()
		app.expectToBeIn('select.idle')
	})

	it('Drags a shape', () => {
		const shape = app.getShapeById(ids.box1)
		app.pointerDown(150, 150, { target: 'shape', shape })
		app.pointerMove(200, 200)
		app.pointerUp()
		app.expectShapeToMatch({ id: ids.box1, x: 150, y: 150 })
	})

	it('Clones a shape, removes the clone, and re-creates the clone', () => {
		const shape = app.getShapeById(ids.box1)
		app.pointerDown(150, 150, { target: 'shape', shape })
		app.pointerMove(200, 200)

		expect(app.shapesArray.length).toBe(1)
		app.expectShapeToMatch({ id: ids.box1, x: 150, y: 150 })
		const t1 = [...app.shapeIds.values()]

		app.keyDown('Alt')
		expect(app.shapesArray.length).toBe(2)
		app.expectShapeToMatch({ id: ids.box1, x: 100, y: 100 })
		// const t2 = [...app.shapeIds.values()]

		app.keyUp('Alt')

		// There's a timer here! We shouldn't end the clone until the timer is done
		expect(app.shapesArray.length).toBe(2)

		jest.advanceTimersByTime(250) // tick tock

		// Timer is done! We should have ended the clone.
		expect(app.shapesArray.length).toBe(1)
		app.expectToBeIn('select.translating')

		app.expectShapeToMatch({ id: ids.box1, x: 150, y: 150 })

		expect([...app.shapeIds.values()]).toMatchObject(t1)

		// todo: Should cloning again duplicate new shapes, or restore the last clone?
		// app.keyDown('Alt')
		// expect(app.shapesArray.length).toBe(2)
		// app.expectShapeToMatch({ id: ids.box1, x: 100, y: 100 })
		// expect([...app.shapeIds.values()]).toMatchObject(t2)
	})

	it('Constrains when holding shift', () => {
		const shape = app.getShapeById(ids.box1)
		app.pointerDown(150, 150, { target: 'shape', shape })
		app.pointerMove(200, 170)
		app.expectShapeToMatch({ id: ids.box1, x: 150, y: 120 })
		app.keyDown('Shift')
		app.expectShapeToMatch({ id: ids.box1, x: 150, y: 100 })
	})

	it('Does not expand selection when holding shift and alt', () => {
		const shape = app.getShapeById(ids.box1)
		app.keyDown('Shift')

		// alt-drag to create a copy:
		app.keyDown('Alt')
		app.pointerDown(150, 150, { target: 'shape', shape })
		app.pointerMove(150, 250)
		app.pointerUp()
		const box2Id = app.onlySelectedShape!.id
		expect(app.shapesArray.length).toStrictEqual(2)
		expect(ids.box1).not.toEqual(box2Id)

		// shift-alt-drag the original, we shouldn't duplicate the copy too:
		app.pointerDown(150, 150, { target: 'shape', shape })
		expect(app.selectedIds).toStrictEqual([ids.box1])
		app.pointerMove(250, 150)
		app.pointerUp()
		expect(app.shapesArray.length).toStrictEqual(3)
	})
})

describe('PointingHandle', () => {
	it('Enters from idle and exits to idle', () => {
		const shape = app.getShapeById(ids.box1)
		app.pointerDown(150, 150, {
			target: 'handle',
			shape,
			handle: { id: 'start', type: 'vertex', index: 'a1', x: 0, y: 0 },
		})
		app.expectToBeIn('select.pointing_handle')

		app.pointerUp()
		app.expectToBeIn('select.idle')
	})

	it('Bails on escape', () => {
		const shape = app.getShapeById(ids.box1)
		app.pointerDown(150, 150, {
			target: 'handle',
			shape,
			handle: { id: 'start', type: 'vertex', index: 'a1', x: 0, y: 0 },
		})
		app.expectToBeIn('select.pointing_handle')
		app.cancel()
		app.expectToBeIn('select.idle')
	})
})

describe('DraggingHandle', () => {
	it('Enters from pointing_handle and exits to idle', () => {
		const shape = app.getShapeById(ids.box1)
		app.pointerDown(150, 150, {
			target: 'handle',
			shape,
			handle: { id: 'start', type: 'vertex', index: 'a1', x: 0, y: 0 },
		})
		app.pointerMove(100, 100)
		app.expectToBeIn('select.dragging_handle')

		app.pointerUp()
		app.expectToBeIn('select.idle')
	})

	it('Bails on escape', () => {
		const shape = app.getShapeById(ids.box1)

		app.pointerDown(150, 150, {
			target: 'handle',
			shape,
			handle: { id: 'start', type: 'vertex', index: 'a1', x: 0, y: 0 },
		})
		app.pointerMove(100, 100)
		app.expectToBeIn('select.dragging_handle')
		app.cancel()
		app.expectToBeIn('select.idle')
	})
})

describe('When double clicking a shape', () => {
	it('begins editing a geo shapes label', () => {
		app
			.selectAll()
			.deleteShapes()
			.selectNone()
			.createShapes([{ id: app.createShapeId(), type: 'geo' }])
			.doubleClick(50, 50, { target: 'shape', shape: app.shapesArray[0] })
			.expectToBeIn('select.editing_shape')
	})
})

describe('When pressing enter on a selected shape', () => {
	it('begins editing a geo shapes label', () => {
		const id = app.createShapeId()
		app
			.selectAll()
			.deleteShapes()
			.selectNone()
			.createShapes([{ id, type: 'geo' }])
			.select(id)
			.keyUp('Enter')
			.expectToBeIn('select.editing_shape')
	})
})

// it('selects the child of a group', () => {
//   const id1 = app.createShapeId()
//   const id2 = app.createShapeId()
//   app
//     .selectAll()
//     .deleteShapes()
//     .selectNone()
//     .createShapes([
//       { id: id1, type: 'geo', x: 100, y: 100 },
//       { id: id2, type: 'geo', x: 200, y: 200 },
//     ])
//     .selectAll()
//     .groupShapes()
//     .doubleClick(50, 50, { target: 'shape', shape: app.getShapeById(id1) })
//     .expectToBeIn('select.editing_shape')
// })

describe('When double clicking the selection edge', () => {
	it('Resets text scale when double clicking the edge of the text', () => {
		const id = app.createShapeId()
		app
			.selectAll()
			.deleteShapes()
			.selectNone()
			.createShapes([{ id, type: 'text', x: 100, y: 100, props: { scale: 2, text: 'hello' } }])
			.select(id)
			.doubleClick(100, 100, { target: 'selection', handle: 'left' })

		app.expectShapeToMatch({ id, props: { scale: 1 } })
	})

	it('Resets text autosize first when double clicking the edge of the text', () => {
		const id = app.createShapeId()
		app
			.selectAll()
			.deleteShapes()
			.selectNone()
			.createShapes([
				{
					id,
					type: 'text',
					props: { scale: 2, autoSize: false, w: 200, text: 'hello' },
				},
			])
			.select(id)
			.doubleClick(100, 100, { target: 'selection', handle: 'left' })

		app.expectShapeToMatch({ id, props: { scale: 2, autoSize: true } })

		app.doubleClick(100, 100, { target: 'selection', handle: 'left' })

		app.expectShapeToMatch({ id, props: { scale: 1, autoSize: true } })
	})

	it('Begins editing the text if handler returns no change', () => {
		const id = app.createShapeId()
		app
			.selectAll()
			.deleteShapes()
			.selectNone()
			.createShapes([
				{
					id,
					type: 'text',
					props: { scale: 2, autoSize: false, w: 200, text: 'hello' },
				},
			])
			.select(id)
			.doubleClick(100, 100, { target: 'selection', handle: 'left' })
			.doubleClick(100, 100, { target: 'selection', handle: 'left' })

		expect(app.editingId).toBe(null)
		app.expectShapeToMatch({ id, props: { scale: 1, autoSize: true } })

		app.doubleClick(100, 100, { target: 'selection', handle: 'left' })

		expect(app.editingId).toBe(id)
	})

	it('Selects a geo shape when double clicking on its edge', () => {
		const id = app.createShapeId()
		app
			.selectAll()
			.deleteShapes()
			.selectNone()
			.createShapes([
				{
					id,
					type: 'geo',
				},
			])
			.select(id)
		expect(app.editingId).toBe(null)

		app.doubleClick(100, 100, { target: 'selection', handle: 'left' })

		expect(app.editingId).toBe(id)
	})
})

describe('When editing shapes', () => {
	let ids: any

	beforeEach(() => {
		ids = {
			geo1: app.createShapeId(),
			geo2: app.createShapeId(),
			text1: app.createShapeId(),
			text2: app.createShapeId(),
		}

		app.createShapes([
			{ id: ids.geo1, type: 'geo', props: { text: 'hello world ' } },
			{ id: ids.geo2, type: 'geo', props: { text: 'hello world ' } },
			{ id: ids.text1, type: 'text', props: { text: 'hello world ' } },
			{ id: ids.text2, type: 'text', props: { text: 'hello world ' } },
		])
	})

	it('Pointing a shape of a different type selects it and leaves editing', () => {
		expect(app.editingId).toBe(null)
		expect(app.selectedIds.length).toBe(0)

		// start editing the geo shape
		app.doubleClick(50, 50, { target: 'shape', shape: app.getShapeById(ids.geo1) })
		expect(app.editingId).toBe(ids.geo1)
		expect(app.onlySelectedShape?.id).toBe(ids.geo1)
		// point the text shape
		app.pointerDown(50, 50, { target: 'shape', shape: app.getShapeById(ids.text1) })
		expect(app.editingId).toBe(null)
		expect(app.onlySelectedShape?.id).toBe(ids.text1)
	})

	it('Pointing a shape of a different type selects it and leaves editing', () => {
		expect(app.editingId).toBe(null)
		expect(app.selectedIds.length).toBe(0)

		// start editing the geo shape
		app.doubleClick(50, 50, { target: 'shape', shape: app.getShapeById(ids.geo1) })
		expect(app.editingId).toBe(ids.geo1)
		expect(app.onlySelectedShape?.id).toBe(ids.geo1)
		// point the other geo shape
		app.pointerDown(50, 50, { target: 'shape', shape: app.getShapeById(ids.geo2) })
		// that other shape should now be editing and selected!
		expect(app.editingId).toBe(ids.geo2)
		expect(app.onlySelectedShape?.id).toBe(ids.geo2)
	})

	it('Works with text, too', () => {
		expect(app.editingId).toBe(null)
		expect(app.selectedIds.length).toBe(0)

		// start editing the geo shape
		app.doubleClick(50, 50, { target: 'shape', shape: app.getShapeById(ids.text1) })
		app.pointerDown(50, 50, { target: 'shape', shape: app.getShapeById(ids.text2) })
		// that other shape should now be editing and selected!
		expect(app.editingId).toBe(ids.text2)
		expect(app.onlySelectedShape?.id).toBe(ids.text2)
	})

	it('Double clicking the canvas creates a new text shape', () => {
		expect(app.editingId).toBe(null)
		expect(app.selectedIds.length).toBe(0)
		expect(app.shapesArray.length).toBe(5)
		app.doubleClick(750, 750)
		expect(app.shapesArray.length).toBe(6)
		expect(app.shapesArray[5].type).toBe('text')
	})

	it('It deletes an empty text shape when your click away', () => {
		expect(app.editingId).toBe(null)
		expect(app.selectedIds.length).toBe(0)
		expect(app.shapesArray.length).toBe(5)

		// Create a new shape by double clicking
		app.doubleClick(750, 750)
		expect(app.selectedIds.length).toBe(1)
		expect(app.shapesArray.length).toBe(6)
		const shapeId = app.selectedIds[0]

		// Click away
		app.click(1000, 1000)
		expect(app.selectedIds.length).toBe(0)
		expect(app.shapesArray.length).toBe(5)
		expect(app.getShapeById(shapeId)).toBe(undefined)
	})

	it('It deletes an empty text shape when your click another text shape', () => {
		expect(app.editingId).toBe(null)
		expect(app.selectedIds.length).toBe(0)
		expect(app.shapesArray.length).toBe(5)

		// Create a new shape by double clicking
		app.doubleClick(750, 750)
		expect(app.selectedIds.length).toBe(1)
		expect(app.shapesArray.length).toBe(6)
		const shapeId = app.selectedIds[0]

		// Click another text shape
		app.click(50, 50, { target: 'shape', shape: app.getShapeById(ids.text1) })
		expect(app.selectedIds.length).toBe(1)
		expect(app.shapesArray.length).toBe(5)
		expect(app.getShapeById(shapeId)).toBe(undefined)
	})

	it.todo('restores selection after changing styles')
})

describe('When in readonly mode', () => {
	beforeEach(() => {
		app.createShapes([
			{
				id: ids.embed1,
				type: 'embed',
				x: 100,
				y: 100,
				props: { opacity: '1', w: 100, h: 100, url: '', doesResize: false },
			},
		])
		app.setReadOnly(true)
		app.setSelectedTool('select')
	})

	it('Begins editing embed when double clicked', () => {
		expect(app.editingId).toBe(null)
		expect(app.selectedIds.length).toBe(0)
		expect(app.isReadOnly).toBe(true)

		const shape = app.getShapeById(ids.embed1)
		app.doubleClick(100, 100, { target: 'shape', shape })
		expect(app.editingId).toBe(ids.embed1)
	})

	it('Begins editing embed when pressing Enter on a selected embed', () => {
		expect(app.editingId).toBe(null)
		expect(app.selectedIds.length).toBe(0)
		expect(app.isReadOnly).toBe(true)

		app.setSelectedIds([ids.embed1])
		expect(app.selectedIds.length).toBe(1)

		app.keyUp('Enter')
		expect(app.editingId).toBe(ids.embed1)
	})
})
