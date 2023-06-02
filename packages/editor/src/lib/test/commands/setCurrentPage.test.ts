import { createCustomShapeId, PageRecordType, TLPageId } from '@tldraw/tlschema'
import { TestApp } from '../TestEditor'

let app: TestApp

beforeEach(() => {
	app = new TestApp()
})

describe('setCurrentPage', () => {
	it('sets the current page', () => {
		const page1Id = app.pages[0].id
		const page2Id = PageRecordType.createCustomId('page2')

		app.createPage('New Page 2', page2Id)
		expect(app.currentPageId).toEqual(page2Id)
		expect(app.currentPage).toEqual(app.pages[1])

		app.setCurrentPageId(page1Id)

		expect(app.currentPage).toEqual(app.pages[0])

		const page3Id = PageRecordType.createCustomId('page3')
		app.createPage('New Page 3', page3Id)

		expect(app.currentPageId).toEqual(page3Id)
		expect(app.currentPage).toEqual(app.pages[2])

		app.setCurrentPageId(app.pages[0].id)

		expect(app.currentPageId).toEqual(app.pages[0].id)
		expect(app.currentPage).toEqual(app.pages[0])
	})

	it('adds tab state for the page if it doesnt already exist', () => {
		app.setCamera(1, 2, 4)
		expect(app.camera).toMatchObject({ x: 1, y: 2, z: 4 })

		const page = PageRecordType.create({ name: 'test', index: 'a4' })
		app.store.put([page])

		expect(app.getPageStateByPageId(page.id)).toBeUndefined()

		app.setCurrentPageId(page.id)

		expect(app.getPageStateByPageId(page.id)).not.toBeUndefined()

		expect(app.camera).toMatchObject({ x: 0, y: 0, z: 1 })
	})

	it('squashes', () => {
		const page2Id = PageRecordType.createCustomId('page2')
		app.createPage('New Page 2', page2Id)

		app.history.clear()
		app.setCurrentPageId(app.pages[1].id)
		app.setCurrentPageId(app.pages[0].id)
		app.setCurrentPageId(app.pages[0].id)
		expect(app.history.numUndos).toBe(1)
	})

	it('preserves the undo stack', () => {
		const boxId = createCustomShapeId('geo')
		const page2Id = PageRecordType.createCustomId('page2')
		app.createPage('New Page 2', page2Id)

		app.history.clear()
		app.createShapes([{ type: 'geo', id: boxId, props: { w: 100, h: 100 } }])
		app.undo()
		app.setCurrentPageId(app.pages[1].id)
		app.setCurrentPageId(app.pages[0].id)
		app.setCurrentPageId(app.pages[0].id)
		expect(app.getShapeById(boxId)).toBeUndefined()
		expect(app.history.numUndos).toBe(1)
		app.redo()
		expect(app.getShapeById(boxId)).not.toBeUndefined()
	})

	it('logs an error when trying to navigate to a page that does not exist', () => {
		const page2Id = PageRecordType.createCustomId('page2')
		app.createPage('New Page 2', page2Id)
		console.error = jest.fn()

		expect(() => {
			app.setCurrentPageId('page:does-not-exist' as TLPageId)
		}).not.toThrow()

		expect(console.error).toHaveBeenCalled()
		expect(app.currentPageId).toEqual(page2Id)
	})
})
