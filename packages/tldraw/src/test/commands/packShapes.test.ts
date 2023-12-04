import { createShapeId } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	boxA: createShapeId('boxA'),
	boxB: createShapeId('boxB'),
	boxC: createShapeId('boxC'),
	boxD: createShapeId('boxD'),
}

jest.useFakeTimers()

beforeEach(() => {
	editor = new TestEditor()
	editor.selectAll()
	editor.deleteShapes(editor.getSelectedShapeIds())
	editor.createShapes([
		{
			id: ids.boxA,
			type: 'geo',
			x: 0,
			y: 0,
		},
		{
			id: ids.boxB,
			type: 'geo',
			x: 100,
			y: 100,
		},
		{
			id: ids.boxC,
			type: 'geo',
			x: 400,
			y: 400,
		},
	])
})

describe('editor.packShapes', () => {
	it('packs shapes', () => {
		editor.selectAll()
		const centerBefore = editor.getSelectionRotatedPageBounds()!.center.clone()
		editor.packShapes(editor.getSelectedShapeIds(), 16)
		jest.advanceTimersByTime(1000)
		expect(
			editor.getCurrentPageShapes().map((s) => ({ ...s, parentId: 'wahtever' }))
		).toMatchSnapshot('packed shapes')
		const centerAfter = editor.getSelectionRotatedPageBounds()!.center.clone()
		expect(centerBefore).toMatchObject(centerAfter)
	})

	it('packs rotated shapes', () => {
		editor.updateShapes([{ id: ids.boxA, type: 'geo', rotation: Math.PI }])
		editor.selectAll().packShapes(editor.getSelectedShapeIds(), 16)
		jest.advanceTimersByTime(1000)
		expect(
			editor.getCurrentPageShapes().map((s) => ({ ...s, parentId: 'wahtever' }))
		).toMatchSnapshot('packed shapes')
	})
})
