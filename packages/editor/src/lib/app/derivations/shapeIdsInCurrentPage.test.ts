import { PageRecordType, createCustomShapeId } from '@tldraw/tlschema'
import { TestEditor } from '../../test/TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

const ids = {
	box1: createCustomShapeId('box1'),
	box2: createCustomShapeId('box2'),
	box3: createCustomShapeId('box3'),

	box4: createCustomShapeId('box4'),
	box5: createCustomShapeId('box5'),
	box6: createCustomShapeId('box6'),
}

describe('shapeIdsInCurrentPage', () => {
	it('keeps the shape ids in the current page', () => {
		expect(new Set(editor.shapeIds)).toEqual(new Set([]))
		editor.createShapes([{ type: 'geo', id: ids.box1 }])

		expect(new Set(editor.shapeIds)).toEqual(new Set([ids.box1]))

		editor.createShapes([{ type: 'geo', id: ids.box2 }])

		expect(new Set(editor.shapeIds)).toEqual(new Set([ids.box1, ids.box2]))

		editor.createShapes([{ type: 'geo', id: ids.box3 }])

		expect(new Set(editor.shapeIds)).toEqual(new Set([ids.box1, ids.box2, ids.box3]))

		editor.deleteShapes([ids.box2])

		expect(new Set(editor.shapeIds)).toEqual(new Set([ids.box1, ids.box3]))

		editor.deleteShapes([ids.box1])

		expect(new Set(editor.shapeIds)).toEqual(new Set([ids.box3]))

		editor.deleteShapes([ids.box3])

		expect(new Set(editor.shapeIds)).toEqual(new Set([]))
	})

	it('changes when the current page changes', () => {
		editor.createShapes([
			{ type: 'geo', id: ids.box1 },
			{ type: 'geo', id: ids.box2 },
			{ type: 'geo', id: ids.box3 },
		])
		const id = PageRecordType.createCustomId('page2')
		editor.createPage('New Page 2', id)
		editor.setCurrentPageId(id)
		editor.createShapes([
			{ type: 'geo', id: ids.box4 },
			{ type: 'geo', id: ids.box5 },
			{ type: 'geo', id: ids.box6 },
		])

		expect(new Set(editor.shapeIds)).toEqual(new Set([ids.box4, ids.box5, ids.box6]))

		editor.setCurrentPageId(editor.pages[0].id)

		expect(new Set(editor.shapeIds)).toEqual(new Set([ids.box1, ids.box2, ids.box3]))
	})
})
