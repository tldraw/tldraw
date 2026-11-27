import { createShapeId, toRichText } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

const id = createShapeId('a')

function setupEditor() {
	const editor = new TestEditor()
	editor.createShapes([{ id, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }])
	return editor
}

describe('the default tools ask capabilities', () => {
	it('does not draw without create-shapes', () => {
		const editor = setupEditor()
		editor.registerCapabilityCheck('create-shapes', () => false)
		editor.setCurrentTool('geo')
		editor.pointerDown(300, 300).pointerMove(400, 400).pointerUp()
		expect(editor.getCurrentPageShapeIds().size).toBe(1)
	})

	it("passes the tool's shape type to create-shapes", () => {
		const editor = setupEditor()
		const seen: unknown[] = []
		editor.registerCapabilityCheck('create-shapes', (data) => {
			seen.push(data)
			return data?.shapes[0].type !== 'geo'
		})
		editor.setCurrentTool('geo')
		editor.pointerDown(300, 300).pointerMove(400, 400).pointerUp()
		expect(editor.getCurrentPageShapeIds().size).toBe(1)
		expect(seen).toEqual([{ shapes: [{ type: 'geo', props: { geo: 'rectangle' } }] }])

		editor.setCurrentTool('draw')
		editor.pointerDown(300, 300).pointerMove(400, 400).pointerUp()
		expect(editor.getCurrentPageShapeIds().size).toBe(2)
	})

	it('passes the shapes to edit-shapes, so a check can allow some of them', () => {
		const editor = setupEditor()
		const other = createShapeId('b')
		editor.createShapes([{ id: other, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } }])
		editor.registerCapabilityCheck('edit-shapes', (data) =>
			data?.shapes.every((shape) => shape.id !== id)
		)
		editor.pointerDown(50, 50, id).pointerMove(150, 150).pointerUp()
		expect(editor.getShape(id)!.x).toBe(0)
		editor.pointerDown(250, 50, other).pointerMove(350, 150).pointerUp()
		expect(editor.getShape(other)!.x).toBe(300)
	})

	it('selects but does not drag, nudge or edit without edit-shapes', () => {
		const editor = setupEditor()
		editor.registerCapabilityCheck('edit-shapes', () => false)
		editor.pointerDown(50, 50, id).pointerMove(150, 150).pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([id])
		expect(editor.getShape(id)!.x).toBe(0)

		editor.keyDown('ArrowRight').keyUp('ArrowRight')
		expect(editor.getShape(id)!.x).toBe(0)

		expect(editor.canEditShape(id)).toBe(false)
	})

	it('does not run double click handlers without edit-shapes', () => {
		const editor = setupEditor()
		editor.registerCapabilityCheck('edit-shapes', () => false)
		editor.doubleClick(50, 50, id, { altKey: true })
		expect(editor.getShape(id)!.props).toMatchObject({ geo: 'rectangle' })

		const frameId = createShapeId('frame')
		editor.createShapes([
			{ id: frameId, type: 'frame', x: 200, y: 0, props: { w: 800, h: 600 } },
			{ type: 'geo', parentId: frameId, x: 300, y: 200, props: { w: 100, h: 100 } },
		])
		editor.select(frameId)
		editor.doubleClick(1000, 300, { target: 'selection', handle: 'right' })
		expect(editor.getShape(frameId)!.props).toMatchObject({ w: 800, h: 600 })
	})

	it('does not move an arrow label without edit-shapes', () => {
		const editor = setupEditor()
		const arrowId = createShapeId('arrow')
		editor.createShapes([
			{
				id: arrowId,
				type: 'arrow',
				x: 100,
				y: 300,
				props: { richText: toRichText('label'), start: { x: 0, y: 0 }, end: { x: 200, y: 0 } },
			},
		])
		editor.registerCapabilityCheck('edit-shapes', () => false)
		const before = editor.getShape(arrowId)!.props
		const shape = editor.getShape(arrowId)!
		editor.pointerDown(200, 300, { target: 'shape', shape }).pointerMove(220, 320)
		editor.expectToBeIn('select.pointing_arrow_label')
		editor.pointerMove(260, 300).pointerUp()
		expect(editor.getShape(arrowId)!.props).toEqual(before)
	})

	it('does not replace external content without edit-shapes', async () => {
		const editor = setupEditor()
		const handler = vi.fn()
		editor.registerExternalContentHandler('text', handler)
		editor.registerCapabilityCheck('edit-shapes', () => false)
		await editor.replaceExternalContent({ type: 'text', text: 'hi' })
		expect(handler).not.toHaveBeenCalled()
	})

	it('does not erase without delete-shapes', () => {
		const editor = setupEditor()
		editor.registerCapabilityCheck('delete-shapes', () => false)
		editor.setCurrentTool('eraser')
		editor.pointerDown(0, 50).pointerUp()
		expect(editor.getShape(id)).toBeDefined()
	})

	it('erases only the shapes that delete-shapes allows', () => {
		const editor = setupEditor()
		const other = createShapeId('b')
		editor.createShapes([{ id: other, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } }])
		editor.registerCapabilityCheck('delete-shapes', (data) =>
			data?.shapes.every((shape) => shape.id !== id)
		)
		editor.setCurrentTool('eraser')
		editor.pointerDown(0, 50).pointerUp()
		editor.pointerDown(200, 50).pointerUp()
		expect([!!editor.getShape(id), !!editor.getShape(other)]).toEqual([true, false])
	})

	it('does not erase with an accel-click in the draw tool without delete-shapes', () => {
		const editor = setupEditor()
		editor.registerCapabilityCheck('delete-shapes', () => false)
		editor.setCurrentTool('draw')
		editor
			.pointerDown(0, 50, undefined, { ctrlKey: true })
			.pointerUp(0, 50, undefined, { ctrlKey: true })
		expect(editor.getShape(id)).toBeDefined()
	})

	it('does not take external content without create-shapes', async () => {
		const editor = setupEditor()
		editor.registerCapabilityCheck('create-shapes', () => false)
		await editor.putExternalContent({ type: 'text', text: 'hello' })
		expect(editor.getCurrentPageShapeIds().size).toBe(1)
	})
})
