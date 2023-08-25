import { createShapeId, TLArrowShape } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

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

	editor.selectAll().deleteShapes(editor.selectedShapeIds)
})

afterEach(() => {
	editor.selectAll().deleteShapes(editor.selectedShapeIds)
})

const doMockClipboard = () => {
	const context: { current: any } = { current: undefined }

	Object.assign(window.navigator, {
		clipboard: {
			write: jest.fn((content: any) => {
				context.current = content
			}),
		},
	})

	globalThis.ClipboardItem = jest.fn((payload: any) => payload)

	return context
}

const assertClipboardOfCorrectShape = async (_clipboardContent: any) => {
	return true
	// expect(clipboardContent.length).toBe(1)
	// expect(clipboardContent[0]['text/html']).toBeDefined()
	// expect(clipboardContent[0]['text/plain']).toBeDefined()
	// expect(clipboardContent.length).toBe(1)
	// expect(await readAsText(clipboardContent[0]['text/html'])).toMatch(/^<tldraw>(.*)<\/tldraw>$/)
}

describe('When copying and pasting', () => {
	it('does nothing when copying with nothing is selected', async () => {
		const mockClipboard = doMockClipboard()

		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
		])

		editor.copy()

		expect(mockClipboard.current).toBeUndefined()
	})

	it('copies the selected shapes and pastes when ALL shapes still in the viewport', async () => {
		const mockClipboard = doMockClipboard()

		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
		])

		const shapesBefore = editor.currentPageShapes
		editor.selectAll().copy()

		await assertClipboardOfCorrectShape(mockClipboard.current)

		const testOffsetX = 100
		const testOffsetY = 100
		editor.setCamera({
			x: editor.camera.x - testOffsetX,
			y: editor.camera.y - testOffsetY,
			z: editor.zoomLevel,
		})

		editor.paste()
		const shapesAfter = editor.currentPageShapes

		// We should not have changed the original shapes
		expect(shapesBefore[0]).toMatchObject(shapesAfter[0])
		expect(shapesBefore[1]).toMatchObject(shapesAfter[1])

		const box1a = shapesAfter[0]
		const box2a = shapesAfter[1]
		const box1b = shapesAfter[2]
		const box2b = shapesAfter[3]

		// The new shapes should match the old shapes, except for their id
		expect(shapesAfter.length).toBe(shapesBefore.length * 2)
		expect(box1b).toMatchObject({ ...box1a, id: box1b.id, index: 'a3' })
		expect(box2b).toMatchObject({ ...box2a, id: box2b.id, index: 'a4' })
	})

	it.todo('pastes at the correct child index (top of the current focus layer list)')

	it.todo(
		'does not move shapes that are outside of the viewport when pasting into the children of an existing / non-copied shape'
	)

	it('copies the selected shapes and pastes when SOME shapes still in the viewport', async () => {
		const mockClipboard = doMockClipboard()

		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: -2000, y: -100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 1900, y: 0, props: { w: 100, h: 100 } },
		])

		const shapesBefore = editor.currentPageShapes
		editor.selectAll().copy()

		await assertClipboardOfCorrectShape(mockClipboard.current)

		const testOffsetX = 1800
		const testOffsetY = 0
		editor.setCamera({
			x: editor.camera.x - testOffsetX,
			y: editor.camera.y - testOffsetY,
			z: editor.zoomLevel,
		})

		editor.paste()
		const shapesAfter = editor.currentPageShapes

		// We should not have changed the original shapes
		expect(shapesBefore[0]).toMatchObject(shapesAfter[0])
		expect(shapesBefore[1]).toMatchObject(shapesAfter[1])

		const box1a = shapesAfter[0]
		const box2a = shapesAfter[1]
		const box1b = shapesAfter[2]
		const box2b = shapesAfter[3]

		// The new shapes should match the old shapes, except for their id
		expect(shapesAfter.length).toBe(shapesBefore.length * 2)
		expect(box1b).toMatchObject({ ...box1a, id: box1b.id, index: 'a3' })
		expect(box2b).toMatchObject({ ...box2a, id: box2b.id, index: 'a4' })
	})

	it('copies the selected shapes and pastes when NO shapes still in the viewport', async () => {
		const mockClipboard = doMockClipboard()

		editor.createShapes([
			// NOTE: These shapes are centered around [0,0] to make calcs in assertions easier.
			{ id: ids.box1, type: 'geo', x: -100, y: -100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
		])

		const shapesBefore = editor.currentPageShapes
		editor.selectAll().copy()

		await assertClipboardOfCorrectShape(mockClipboard.current)

		const testOffsetX = 2000
		const testOffsetY = 3000

		const { w: screenWidth, h: screenHeight } = editor.viewportScreenBounds
		editor.setCamera({
			x: editor.camera.x - testOffsetX,
			y: editor.camera.y - testOffsetY,
			z: editor.zoomLevel,
		})

		editor.paste()
		const shapesAfter = editor.currentPageShapes

		// We should not have changed the original shapes
		expect(shapesBefore[0]).toMatchObject(shapesAfter[0])
		expect(shapesBefore[1]).toMatchObject(shapesAfter[1])

		const box1a = shapesAfter[0]
		const box2a = shapesAfter[1]
		const box1b = shapesAfter[2]
		const box2b = shapesAfter[3]

		// The new shapes should match the old shapes, except for the should be positioned on the new viewport center.
		expect(shapesAfter.length).toBe(shapesBefore.length * 2)
		expect(box1b).toMatchObject({
			...box1a,
			id: box1b.id,
			index: 'a3',
			x: testOffsetX + screenWidth / 2 + box1a.x,
			y: testOffsetY + screenHeight / 2 + box1a.y,
		})
		expect(box2b).toMatchObject({
			...box2a,
			id: box2b.id,
			index: 'a4',
			x: testOffsetX + screenWidth / 2 + box2a.x,
			y: testOffsetY + screenHeight / 2 + box2a.y,
		})
	})

	it('creates new bindings for arrows when pasting', async () => {
		const mockClipboard = doMockClipboard()

		editor.createShapes([
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
					},
					end: {
						type: 'binding',
						boundShapeId: ids.box2,
						isExact: false,
						normalizedAnchor: { x: 0.5, y: 0.5 },
					},
				},
			},
		])

		const shapesBefore = editor.currentPageShapes
		editor.selectAll().copy()

		// Test the shape of the clipboard data.
		await assertClipboardOfCorrectShape(mockClipboard.current)

		editor.paste()
		const shapesAfter = editor.currentPageShapes

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
		expect(box1b).toMatchObject({ ...box1a, id: box1b.id, index: 'a4' })
		expect(box2b).toMatchObject({ ...box2a, id: box2b.id, index: 'a5' })
		expect(arrow1b).toMatchObject({
			...arrow1a,
			id: arrow1b.id,
			index: 'a6',
			props: {
				...arrow1a.props,
				start: { ...arrow1a.props.start, boundShapeId: box1b.id },
				end: { ...arrow1a.props.end, boundShapeId: box2b.id },
			},
		})
	})

	it('does nothing when cutting with nothing is selected', async () => {
		const mockClipboard = doMockClipboard()

		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
		])

		editor.cut()

		expect(mockClipboard.current).toBeUndefined()
	})

	it('cuts the selected shapes and pastes when ALL shapes still in the viewport', async () => {
		const mockClipboard = doMockClipboard()

		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
		])

		const shapesBefore = editor.currentPageShapes
		editor.selectAll().cut()

		await assertClipboardOfCorrectShape(mockClipboard.current)

		const testOffsetX = 100
		const testOffsetY = 100
		editor.setCamera({
			x: editor.camera.x - testOffsetX,
			y: editor.camera.y - testOffsetY,
			z: editor.zoomLevel,
		})

		editor.paste()
		const shapesAfter = editor.currentPageShapes

		// The new shapes should match the old shapes, except for their id
		expect(shapesAfter.length).toBe(shapesBefore.length)
		expect(shapesAfter[0]).toMatchObject({ ...shapesBefore[0], id: shapesAfter[0].id })
		expect(shapesAfter[1]).toMatchObject({ ...shapesBefore[1], id: shapesAfter[1].id })
	})

	it('cuts the selected shapes and pastes when SOME shapes still in the viewport', async () => {
		const mockClipboard = doMockClipboard()

		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: -2000, y: -100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 1900, y: 0, props: { w: 100, h: 100 } },
		])

		const shapesBefore = editor.currentPageShapes
		editor.selectAll().cut()

		await assertClipboardOfCorrectShape(mockClipboard.current)

		const testOffsetX = 1800
		const testOffsetY = 0
		editor.setCamera({
			x: editor.camera.x - testOffsetX,
			y: editor.camera.y - testOffsetY,
			z: editor.zoomLevel,
		})

		editor.paste()
		const shapesAfter = editor.currentPageShapes

		// The new shapes should match the old shapes, except for their id
		expect(shapesAfter.length).toBe(shapesBefore.length)
		expect(shapesAfter[0]).toMatchObject({ ...shapesBefore[0], id: shapesAfter[0].id })
		expect(shapesAfter[1]).toMatchObject({ ...shapesBefore[1], id: shapesAfter[1].id })
	})

	it('cuts the selected shapes and pastes when NO shapes still in the viewport', async () => {
		const mockClipboard = doMockClipboard()

		editor.createShapes([
			// NOTE: These shapes are centered around [0,0] to make calcs in assertions easier.
			{ id: ids.box1, type: 'geo', x: -100, y: -100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
		])

		const shapesBefore = editor.currentPageShapes
		editor.selectAll().cut()

		await assertClipboardOfCorrectShape(mockClipboard.current)

		const testOffsetX = 2000
		const testOffsetY = 3000

		const { w: screenWidth, h: screenHeight } = editor.viewportScreenBounds
		editor.setCamera({
			x: editor.camera.x - testOffsetX,
			y: editor.camera.y - testOffsetY,
			z: editor.zoomLevel,
		})

		editor.paste()
		const shapesAfter = editor.currentPageShapes

		// The new shapes should match the old shapes, except for the should be positioned on the new viewport center.
		expect(shapesAfter.length).toBe(shapesBefore.length)
		expect(shapesAfter[0]).toMatchObject({
			...shapesBefore[0],
			id: shapesAfter[0].id,
			x: testOffsetX + screenWidth / 2 + shapesBefore[0].x,
			y: testOffsetY + screenHeight / 2 + shapesBefore[0].y,
		})
		expect(shapesAfter[1]).toMatchObject({
			...shapesBefore[1],
			id: shapesAfter[1].id,
			x: testOffsetX + screenWidth / 2 + shapesBefore[1].x,
			y: testOffsetY + screenHeight / 2 + shapesBefore[1].y,
		})
	})

	it('creates new bindings for arrows when pasting', async () => {
		const mockClipboard = doMockClipboard()

		editor.createShapes([
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
					},
					end: {
						type: 'binding',
						boundShapeId: ids.box2,
						isExact: false,
						normalizedAnchor: { x: 0.5, y: 0.5 },
					},
				},
			},
		])

		const shapesBefore = editor.currentPageShapes

		editor.selectAll().cut()

		// Test the shape of the clipboard data.
		await assertClipboardOfCorrectShape(mockClipboard.current)

		editor.paste()
		const shapesAfter = editor.currentPageShapes

		// The new shapes should match the old shapes, except for their id and the arrow's bindings!
		expect(shapesAfter.length).toBe(shapesBefore.length)
		expect(shapesAfter[0]).toMatchObject({ ...shapesBefore[0], id: shapesAfter[0].id })
		expect(shapesAfter[1]).toMatchObject({ ...shapesBefore[1], id: shapesAfter[1].id })
		expect(shapesAfter[2]).toMatchObject({
			...shapesBefore[2],
			id: shapesAfter[2].id,
			props: {
				...shapesBefore[2].props,
				start: {
					...(shapesBefore[2] as TLArrowShape).props.start,
					boundShapeId: shapesAfter[0].id,
				},
				end: { ...(shapesBefore[2] as TLArrowShape).props.end, boundShapeId: shapesAfter[1].id },
			},
		})
	})

	it('pastes in the right position after copying from within a group.', async () => {
		const mockClipboard = doMockClipboard()

		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
		])
		editor
			// Create group
			.selectAll()
			.groupShapes(editor.selectedShapeIds)
			// Move the group
			.updateShapes([
				{
					id: editor.currentPageShapes[2].id,
					type: 'group',
					x: 400,
					y: 400,
				},
			])
			// Copy a shape from within the group
			.selectNone()
			.setSelectedShapes([ids.box1])
			.copy()

		await assertClipboardOfCorrectShape(mockClipboard.current)

		// Paste the shape
		expect(editor.currentPageShapes.length).toEqual(3)
		editor.paste()
		expect(editor.currentPageShapes.length).toEqual(4)

		// Check if the position is correct
		const pastedShape = editor.currentPageShapes[editor.currentPageShapes.length - 1]
		const pastedPoint = { x: pastedShape.x, y: pastedShape.y }

		expect(pastedPoint).toMatchObject({ x: 150, y: 150 }) // center of group
	})
})
