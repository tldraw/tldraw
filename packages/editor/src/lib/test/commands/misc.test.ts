import { createCustomShapeId, TLInstance, TLPage } from '@tldraw/tlschema'
import { TEST_INSTANCE_ID, TestApp } from '../TestApp'

let app: TestApp

beforeEach(() => {
	app = new TestApp()
})

describe('running any commands', () => {
	it('sets the lastUsedTabId and lastUpdatedPageId', () => {
		expect(app.userDocumentSettings.lastUsedTabId).toBe(null)
		expect(app.userDocumentSettings.lastUpdatedPageId).toBe(null)

		app.createShapes([{ type: 'geo', id: createCustomShapeId('geo'), parentId: app.currentPageId }])

		expect(app.userDocumentSettings.lastUsedTabId).toBe(TEST_INSTANCE_ID)
		expect(app.userDocumentSettings.lastUpdatedPageId).toBe(app.currentPageId)

		app.store.put([
			{
				...app.userDocumentSettings,
				lastUsedTabId: TLInstance.createCustomId('nope'),
				lastUpdatedPageId: TLPage.createCustomId('nope'),
			},
		])

		expect(app.userDocumentSettings.lastUsedTabId).toBe(TLInstance.createCustomId('nope'))
		expect(app.userDocumentSettings.lastUpdatedPageId).toBe(TLPage.createCustomId('nope'))

		app.createShapes([{ type: 'geo', id: createCustomShapeId('geo'), parentId: app.currentPageId }])

		expect(app.userDocumentSettings.lastUsedTabId).toBe(TEST_INSTANCE_ID)
		expect(app.userDocumentSettings.lastUpdatedPageId).toBe(app.currentPageId)
	})
})
