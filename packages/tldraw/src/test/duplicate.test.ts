import { createShapeId, TLArrowShape, TLShapePartial } from '@tldraw/editor'
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
			{
				id: ids.arrow1,
				type: 'arrow',
				x: 150,
				y: 150,
				props: {
					start: {
						type: 'binding',
						boundShapeId: ids.box1,
						isExact: false,
						normalizedAnchor: { x: 0.5, y: 0.5 },
						isPrecise: false,
					},
					end: {
						type: 'binding',
						boundShapeId: ids.box2,
						isExact: false,
						normalizedAnchor: { x: 0.5, y: 0.5 },
						isPrecise: false,
					},
				},
			},
		])

	const shapesBefore = editor.getCurrentPageShapes()

	editor.selectAll().duplicateShapes(editor.getSelectedShapeIds())

	const shapesAfter = editor.getCurrentPageShapes()

	// We should not have changed the original shapes
	expect(shapesBefore[0]).toMatchObject(shapesAfter[0])
	expect(shapesBefore[1]).toMatchObject(shapesAfter[1])
	expect(shapesBefore[2]).toMatchObject(shapesAfter[2])

	const box1a = shapesAfter[0]
	const box2a = shapesAfter[1]
	const arrow1a = shapesAfter[2] as TLArrowShape

	const box1b = shapesAfter[3]
	const box2b = shapesAfter[4]
	const arrow1b = shapesAfter[5]

	// The new shapes should match the old shapes, except for their id and the arrow's bindings!
	expect(shapesAfter.length).toBe(shapesBefore.length * 2)
	expect(box1b).toMatchObject({ ...box1a, id: box1b.id, index: 'a1V' })
	expect(box2b).toMatchObject({ ...box2a, id: box2b.id, index: 'a2V' })
	expect(arrow1b).toMatchObject({
		id: arrow1b.id,
		index: 'a4',
		props: {
			...arrow1a.props,
			start: { ...arrow1a.props.start, boundShapeId: box1b.id },
			end: { ...arrow1a.props.end, boundShapeId: box2b.id },
		},
	})
})

// blood moat incoming
describe('When duplicating shapes that include arrows', () => {
	let shapes: TLShapePartial[]

	beforeEach(() => {
		const box1 = createShapeId()
		const box2 = createShapeId()
		const box3 = createShapeId()

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
				id: createShapeId(),
				type: 'arrow',
				x: 50,
				y: 50,
				props: {
					bend: 200,
					start: {
						type: 'binding',
						normalizedAnchor: { x: 0.75, y: 0.75 },
						boundShapeId: box1,
						isExact: false,
						isPrecise: true,
					},
					end: {
						type: 'binding',
						normalizedAnchor: { x: 0.25, y: 0.25 },
						boundShapeId: box1,
						isExact: false,
						isPrecise: true,
					},
				},
			},
			{
				id: createShapeId(),
				type: 'arrow',
				x: 50,
				y: 50,
				props: {
					bend: -200,
					start: {
						type: 'binding',
						normalizedAnchor: { x: 0.75, y: 0.75 },
						boundShapeId: box1,
						isExact: false,
						isPrecise: true,
					},
					end: {
						type: 'binding',
						normalizedAnchor: { x: 0.25, y: 0.25 },
						boundShapeId: box1,
						isExact: false,
						isPrecise: true,
					},
				},
			},
			{
				id: createShapeId(),
				type: 'arrow',
				x: 50,
				y: 50,
				props: {
					bend: -200,
					start: {
						type: 'binding',
						normalizedAnchor: { x: 0.75, y: 0.75 },
						boundShapeId: box1,
						isExact: false,
						isPrecise: true,
					},
					end: {
						type: 'binding',
						normalizedAnchor: { x: 0.25, y: 0.25 },
						boundShapeId: box3,
						isExact: false,
						isPrecise: true,
					},
				},
			},
		]
	})

	it('Preserves the same selection bounds', () => {
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds()).createShapes(shapes).selectAll()

		const boundsBefore = editor.getSelectionRotatedPageBounds()!
		editor.duplicateShapes(editor.getSelectedShapeIds())
		expect(editor.getSelectionRotatedPageBounds()).toCloselyMatchObject(boundsBefore)
	})

	it('Preserves the same selection bounds when only duplicating the arrows', () => {
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.createShapes(shapes)
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
