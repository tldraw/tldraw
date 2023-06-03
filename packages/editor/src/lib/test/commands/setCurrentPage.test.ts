import { PageRecordType, TLPageId, createShapeId } from '@tldraw/tlschema'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('setCurrentPage', () => {
	it('sets the current page', () => {
		const page1Id = editor.pages[0].id
		const page2Id = PageRecordType.createCustomId('page2')

		editor.createPage('New Page 2', page2Id)
		expect(editor.currentPageId).toEqual(page2Id)
		expect(editor.currentPage).toEqual(editor.pages[1])

		editor.setCurrentPageId(page1Id)

		expect(editor.currentPage).toEqual(editor.pages[0])

		const page3Id = PageRecordType.createCustomId('page3')
		editor.createPage('New Page 3', page3Id)

		expect(editor.currentPageId).toEqual(page3Id)
		expect(editor.currentPage).toEqual(editor.pages[2])

		editor.setCurrentPageId(editor.pages[0].id)

		expect(editor.currentPageId).toEqual(editor.pages[0].id)
		expect(editor.currentPage).toEqual(editor.pages[0])
	})

	it('adds tab state for the page if it doesnt already exist', () => {
		editor.setCamera(1, 2, 4)
		expect(editor.camera).toMatchObject({ x: 1, y: 2, z: 4 })

		const page = PageRecordType.create({ name: 'test', index: 'a4' })
		editor.store.put([page])

		expect(editor.getPageStateByPageId(page.id)).toBeUndefined()

		editor.setCurrentPageId(page.id)

		expect(editor.getPageStateByPageId(page.id)).not.toBeUndefined()

		expect(editor.camera).toMatchObject({ x: 0, y: 0, z: 1 })
	})

	it('squashes', () => {
		const page2Id = PageRecordType.createCustomId('page2')
		editor.createPage('New Page 2', page2Id)

		editor.history.clear()
		editor.setCurrentPageId(editor.pages[1].id)
		editor.setCurrentPageId(editor.pages[0].id)
		editor.setCurrentPageId(editor.pages[0].id)
		expect(editor.history.numUndos).toBe(1)
	})

	it('preserves the undo stack', () => {
		const boxId = createShapeId('geo')
		const page2Id = PageRecordType.createCustomId('page2')
		editor.createPage('New Page 2', page2Id)

		editor.history.clear()
		editor.createShapes([{ type: 'geo', id: boxId, props: { w: 100, h: 100 } }])
		editor.undo()
		editor.setCurrentPageId(editor.pages[1].id)
		editor.setCurrentPageId(editor.pages[0].id)
		editor.setCurrentPageId(editor.pages[0].id)
		expect(editor.getShapeById(boxId)).toBeUndefined()
		expect(editor.history.numUndos).toBe(1)
		editor.redo()
		expect(editor.getShapeById(boxId)).not.toBeUndefined()
	})

	it('logs an error when trying to navigate to a page that does not exist', () => {
		const page2Id = PageRecordType.createCustomId('page2')
		editor.createPage('New Page 2', page2Id)
		console.error = jest.fn()

		expect(() => {
			editor.setCurrentPageId('page:does-not-exist' as TLPageId)
		}).not.toThrow()

		expect(console.error).toHaveBeenCalled()
		expect(editor.currentPageId).toEqual(page2Id)
	})
})
