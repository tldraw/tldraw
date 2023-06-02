import { InstanceRecordType, PageRecordType, createCustomShapeId } from '@tldraw/tlschema'
import { TEST_INSTANCE_ID, TestEditor } from '../TestEditor'

let app: TestEditor

beforeEach(() => {
	app = new TestEditor()
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
				lastUsedTabId: InstanceRecordType.createCustomId('nope'),
				lastUpdatedPageId: PageRecordType.createCustomId('nope'),
			},
		])

		expect(app.userDocumentSettings.lastUsedTabId).toBe(InstanceRecordType.createCustomId('nope'))
		expect(app.userDocumentSettings.lastUpdatedPageId).toBe(PageRecordType.createCustomId('nope'))

		app.createShapes([{ type: 'geo', id: createCustomShapeId('geo'), parentId: app.currentPageId }])

		expect(app.userDocumentSettings.lastUsedTabId).toBe(TEST_INSTANCE_ID)
		expect(app.userDocumentSettings.lastUpdatedPageId).toBe(app.currentPageId)
	})
})
