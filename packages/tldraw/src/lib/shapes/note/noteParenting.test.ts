import { TLShapeId } from '@tldraw/editor'
import { TestEditor } from '../../../test/TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})
afterEach(() => {
	editor?.dispose()
})

function clickCreate(tool: string, [x, y]: [number, number]): TLShapeId {
	editor.setCurrentTool('note')
	editor.pointerDown(x, y)
	editor.pointerUp(x, y)
	const shapes = editor.getSelectedShapes()
	const noteId = shapes[0].id
	return noteId
}

function dragCreate(
	tool: string,
	{
		from,
		to,
	}: {
		from: [number, number]
		to: [number, number]
	}
): TLShapeId {
	editor.setCurrentTool(tool)
	editor.pointerDown(...from)
	editor.pointerMove(...to)
	editor.pointerUp(...to)
	const shapes = editor.getSelectedShapes()
	const rectId = shapes[0].id
	return rectId
}

describe('note parenting', () => {
	it('accepts shapes as children', () => {
		const noteId = clickCreate('note', [0, 0])
		const rectId = dragCreate('geo', { from: [-50, -50], to: [50, 50] })
		expect(editor.getShape(rectId)!.parentId).toBe(noteId)
	})

	it("doesn't accept frames as children", () => {
		clickCreate('note', [0, 0])
		const frameId = dragCreate('frame', { from: [-50, -50], to: [50, 50] })
		expect(editor.getShape(frameId)!.parentId).toBe(editor.getCurrentPageId())
	})

	it('parents shapes when you drag them onto the note', () => {
		const noteId = clickCreate('note', [0, 0])
		const rectId = dragCreate('geo', { from: [200, 200], to: [300, 300] })

		expect(editor.getShape(rectId)!.parentId).toBe(editor.getCurrentPageId())
		editor.pointerDown(250, 250)
		editor.pointerMove(0, 0)
		jest.advanceTimersByTime(200)
		expect(editor.getShape(rectId)!.parentId).toBe(noteId)
		editor.pointerUp()
	})

	it("doesn't parent frames when you drag them onto the note", () => {
		clickCreate('note', [0, 0])
		const frameId = dragCreate('frame', { from: [200, 200], to: [300, 300] })

		expect(editor.getShape(frameId)!.parentId).toBe(editor.getCurrentPageId())
		editor.pointerDown(250, 250)
		editor.pointerMove(0, 0)
		jest.advanceTimersByTime(200)
		expect(editor.getShape(frameId)!.parentId).toBe(editor.getCurrentPageId())
		editor.pointerUp()
	})
})
