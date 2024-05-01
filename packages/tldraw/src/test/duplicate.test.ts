import {
	arrowBindingMakeItSo,
	createBindingId,
	createShapeId,
	getArrowBindings,
	sortByIndex,
	TLArrowShape,
	TLBindingPartial,
	TLShapePartial,
} from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
	box4: createShapeId('box4'),
	arrow1: createShapeId('arrow1'),
}

beforeEach(() => {
	editor = new TestEditor()

	editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
})
it('creates new bindings for arrows when pasting', async () => {
	editor
		.selectAll()
		.deleteShapes(editor.getSelectedShapeIds())
		.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
			{ id: ids.arrow1, type: 'arrow', x: 150, y: 150 },
		])

	arrowBindingMakeItSo(editor, ids.arrow1, ids.box1, {
		terminal: 'start',
		isExact: false,
		normalizedAnchor: { x: 0.5, y: 0.5 },
		isPrecise: false,
	})
	arrowBindingMakeItSo(editor, ids.arrow1, ids.box2, {
		terminal: 'end',
		isExact: false,
		normalizedAnchor: { x: 0.5, y: 0.5 },
		isPrecise: false,
	})

	const shapesBefore = editor.getCurrentPageShapesSorted()
	const bindingsBefore = getArrowBindings(editor, shapesBefore[2] as TLArrowShape)

	editor.selectAll().duplicateShapes(editor.getSelectedShapeIds())

	const shapesAfter = editor.getCurrentPageShapesSorted()

	// We should not have changed the original shapes
	expect(shapesBefore[0]).toMatchObject(shapesAfter[0])
	expect(shapesBefore[1]).toMatchObject(shapesAfter[2])
	expect(shapesBefore[2]).toMatchObject(shapesAfter[4])

	const box1a = shapesAfter[0]
	const box2a = shapesAfter[2]
	const arrow1a = shapesAfter[4] as TLArrowShape

	const box1b = shapesAfter[1]
	const box2b = shapesAfter[3]
	const arrow1b = shapesAfter[5] as TLArrowShape

	// The new shapes should match the old shapes, except for their id and the arrow's bindings!
	expect(shapesAfter.length).toBe(shapesBefore.length * 2)
	expect(box1b).toMatchObject({ ...box1a, id: box1b.id, index: 'a1V' })
	expect(box2b).toMatchObject({ ...box2a, id: box2b.id, index: 'a2V' })
	expect(arrow1b).toMatchObject({
		id: arrow1b.id,
		index: 'a4',
		props: {
			...arrow1a.props,
		},
	})
	expect(getArrowBindings(editor, arrow1b)).toMatchObject({
		start: { toId: box1b.id, props: bindingsBefore.start!.props },
		end: { toId: box2b.id, props: bindingsBefore.end!.props },
	})
})

// blood moat incoming
describe('When duplicating shapes that include arrows', () => {
	let shapes: TLShapePartial[]
	let bindings: TLBindingPartial[]

	beforeEach(() => {
		const box1 = createShapeId()
		const box2 = createShapeId()
		const box3 = createShapeId()

		const arrow1 = createShapeId()
		const arrow2 = createShapeId()
		const arrow3 = createShapeId()

		shapes = [
			{
				id: box1,
				type: 'geo',
				x: 0,
				y: 0,
			},
			{
				id: box2,
				type: 'geo',
				x: 300,
				y: 300,
			},
			{
				id: box3,
				type: 'geo',
				x: 300,
				y: 0,
			},
			{
				id: arrow1,
				type: 'arrow',
				x: 50,
				y: 50,
				props: {
					bend: 200,
					start: { x: 0, y: 0 },
					end: { x: 0, y: 0 },
				},
			},
			{
				id: arrow2,
				type: 'arrow',
				x: 50,
				y: 50,
				props: {
					bend: -200,
					start: { x: 0, y: 0 },
					end: { x: 0, y: 0 },
				},
			},
			{
				id: arrow3,
				type: 'arrow',
				x: 50,
				y: 50,
				props: {
					bend: -200,
					start: { x: 0, y: 0 },
					end: { x: 0, y: 0 },
				},
			},
		]

		bindings = [
			{
				id: createBindingId(),
				fromId: arrow1,
				toId: box1,
				type: 'arrow',
				props: {
					terminal: 'start',
					normalizedAnchor: { x: 0.75, y: 0.75 },
					isExact: false,
					isPrecise: true,
				},
			},
			{
				id: createBindingId(),
				fromId: arrow1,
				toId: box1,
				type: 'arrow',
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.25, y: 0.25 },
					isExact: false,
					isPrecise: true,
				},
			},

			{
				id: createBindingId(),
				fromId: arrow2,
				toId: box1,
				type: 'arrow',
				props: {
					terminal: 'start',
					normalizedAnchor: { x: 0.75, y: 0.75 },
					isExact: false,
					isPrecise: true,
				},
			},
			{
				id: createBindingId(),
				fromId: arrow2,
				toId: box1,
				type: 'arrow',
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.25, y: 0.25 },
					isExact: false,
					isPrecise: true,
				},
			},

			{
				id: createBindingId(),
				fromId: arrow3,
				toId: box1,
				type: 'arrow',
				props: {
					terminal: 'start',
					normalizedAnchor: { x: 0.75, y: 0.75 },
					isExact: false,
					isPrecise: true,
				},
			},
			{
				id: createBindingId(),
				fromId: arrow3,
				toId: box3,
				type: 'arrow',
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.25, y: 0.25 },
					isExact: false,
					isPrecise: true,
				},
			},
		]
	})

	it('Preserves the same selection bounds', () => {
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.createShapes(shapes)
			.createBindings(bindings)
			.selectAll()

		const boundsBefore = editor.getSelectionRotatedPageBounds()!
		editor.duplicateShapes(editor.getSelectedShapeIds())
		expect(editor.getSelectionRotatedPageBounds()).toCloselyMatchObject(boundsBefore)
	})

	it('Preserves the same selection bounds when only duplicating the arrows', () => {
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.createShapes(shapes)
			.createBindings(bindings)
			.select(
				...editor
					.getCurrentPageShapes()
					.filter((s) => editor.isShapeOfType<TLArrowShape>(s, 'arrow'))
					.map((s) => s.id)
			)

		const boundsBefore = editor.getSelectionRotatedPageBounds()!
		editor.duplicateShapes(editor.getSelectedShapeIds())
		const boundsAfter = editor.getSelectionRotatedPageBounds()!

		// It's not exactly exact, but close enough is plenty close
		expect(Math.abs(boundsAfter.x - boundsBefore.x)).toBeLessThan(1)
		expect(Math.abs(boundsAfter.y - boundsBefore.y)).toBeLessThan(1)
		expect(Math.abs(boundsAfter.w - boundsBefore.w)).toBeLessThan(1)
		expect(Math.abs(boundsAfter.h - boundsBefore.h)).toBeLessThan(1)

		// If you're feeling up to it:
		// expect(editor.selectionRotatedBounds).toCloselyMatchObject(boundsBefore)
	})
})

describe('When duplicating shapes after cloning', () => {
	beforeEach(() => {
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.createShape({ id: ids.box1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
	})
	it('preserves the cloning properties (offset and shapes)', () => {
		// Clone the shape by alt dragging it to a new location
		expect(editor.getCurrentPageShapeIds().size).toBe(1)

		editor.keyDown('Alt')
		editor.select(ids.box1).pointerDown(50, 50, ids.box1).pointerMove(30, 40).pointerUp(30, 40) // [-20, -10]
		editor.keyUp('Alt')
		const shape = editor.getSelectedShapes()[0]
		expect(editor.getCurrentPageShapeIds().size).toBe(2)
		expect(shape.id).not.toBe(ids.box1)
		expect(shape.x).toBe(-20)
		expect(shape.y).toBe(-10)

		// Make sure the duplicate props are set
		let instance = editor.getInstanceState()
		let duplicateProps = instance?.duplicateProps
		if (!duplicateProps) throw new Error('duplicateProps should be set')
		expect(duplicateProps.shapeIds).toEqual([shape.id])
		expect(duplicateProps.offset).toEqual({ x: -20, y: -10 })

		// Make sure duplication with these props works (we can't invoke the duplicate action directly since it's a hook)
		editor.duplicateShapes(duplicateProps.shapeIds, duplicateProps.offset)
		const newShapes = editor.getSelectedShapes()
		expect(newShapes.length).toBe(1)
		expect(newShapes[0].x).toBe(-40)
		expect(newShapes[0].y).toBe(-20)

		// Make sure the duplicate props are cleared when we select a different shape
		editor.select(ids.box1)
		instance = editor.getInstanceState()
		duplicateProps = instance?.duplicateProps
		expect(duplicateProps).toBe(null)
	})
})

test('can duplicate arrows bound to parents and children', () => {
	// draw a frame
	editor.setCurrentTool('frame').pointerDown(0, 0).pointerMove(400, 400).pointerUp()
	const frameId = editor.getOnlySelectedShapeId()!

	// draw a box in the frame
	editor.setCurrentTool('geo').pointerDown(100, 100).pointerMove(200, 200).pointerUp()
	const boxId = editor.getOnlySelectedShapeId()!
	expect(editor.getOnlySelectedShape()!.parentId).toBe(frameId)

	// draw an arrow from the box to the frame
	editor.setCurrentTool('arrow').pointerDown(150, 150).pointerMove(300, 300).pointerUp()
	const arrowId = editor.getOnlySelectedShapeId()!
	expect(getArrowBindings(editor, editor.getOnlySelectedShape() as TLArrowShape)).toMatchObject({
		start: { toId: boxId },
		end: { toId: frameId },
	})

	// select the arrow and the box, but not the frame
	editor.duplicateShapes([boxId, arrowId])
	const newShapes = editor.getSelectedShapes().toSorted(sortByIndex)
	expect(newShapes).toMatchObject([{ type: 'geo' }, { type: 'arrow' }])
	expect(getArrowBindings(editor, newShapes[1] as TLArrowShape)).toMatchObject({
		start: { toId: newShapes[0].id },
		end: undefined,
	})
})
