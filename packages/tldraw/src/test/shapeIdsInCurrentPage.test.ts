import { createShapeId, PageRecordType } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor = {} as TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),

	box4: createShapeId('box4'),
	box5: createShapeId('box5'),
	box6: createShapeId('box6'),
}

describe('shapeIdsInCurrentPage', () => {
	it('keeps the shape ids in the current page', () => {
		expect(new Set(editor.currentPageShapeIds)).toEqual(new Set([]))
		editor.createShapes([{ type: 'geo', id: ids.box1 }])

		expect(new Set(editor.currentPageShapeIds)).toEqual(new Set([ids.box1]))

		editor.createShapes([{ type: 'geo', id: ids.box2 }])

		expect(new Set(editor.currentPageShapeIds)).toEqual(new Set([ids.box1, ids.box2]))

		editor.createShapes([{ type: 'geo', id: ids.box3 }])

		expect(new Set(editor.currentPageShapeIds)).toEqual(new Set([ids.box1, ids.box2, ids.box3]))

		editor.deleteShapes([ids.box2])

		expect(new Set(editor.currentPageShapeIds)).toEqual(new Set([ids.box1, ids.box3]))

		editor.deleteShapes([ids.box1])

		expect(new Set(editor.currentPageShapeIds)).toEqual(new Set([ids.box3]))

		editor.deleteShapes([ids.box3])

		expect(new Set(editor.currentPageShapeIds)).toEqual(new Set([]))
	})

	it('changes when the current page changes', () => {
		editor.createShapes([
			{ type: 'geo', id: ids.box1 },
			{ type: 'geo', id: ids.box2 },
			{ type: 'geo', id: ids.box3 },
		])
		const id = PageRecordType.createId('page2')
		editor.createPage({ name: 'New Page 2', id })
		editor.setCurrentPage(id)
		editor.createShapes([
			{ type: 'geo', id: ids.box4 },
			{ type: 'geo', id: ids.box5 },
			{ type: 'geo', id: ids.box6 },
		])

		expect(new Set(editor.currentPageShapeIds)).toEqual(new Set([ids.box4, ids.box5, ids.box6]))

		editor.setCurrentPage(editor.pages[0].id)

		expect(new Set(editor.currentPageShapeIds)).toEqual(new Set([ids.box1, ids.box2, ids.box3]))
	})
})
