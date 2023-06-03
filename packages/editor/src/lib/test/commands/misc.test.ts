import { InstanceRecordType, PageRecordType, createShapeId } from '@tldraw/tlschema'
import { TEST_INSTANCE_ID, TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('running any commands', () => {
	it('sets the lastUsedTabId and lastUpdatedPageId', () => {
		expect(editor.userDocumentSettings.lastUsedTabId).toBe(null)
		expect(editor.userDocumentSettings.lastUpdatedPageId).toBe(null)

		editor.createShapes([{ type: 'geo', id: createShapeId('geo'), parentId: editor.currentPageId }])

		expect(editor.userDocumentSettings.lastUsedTabId).toBe(TEST_INSTANCE_ID)
		expect(editor.userDocumentSettings.lastUpdatedPageId).toBe(editor.currentPageId)

		editor.store.put([
			{
				...editor.userDocumentSettings,
				lastUsedTabId: InstanceRecordType.createCustomId('nope'),
				lastUpdatedPageId: PageRecordType.createCustomId('nope'),
			},
		])

		expect(editor.userDocumentSettings.lastUsedTabId).toBe(
			InstanceRecordType.createCustomId('nope')
		)
		expect(editor.userDocumentSettings.lastUpdatedPageId).toBe(
			PageRecordType.createCustomId('nope')
		)

		editor.createShapes([{ type: 'geo', id: createShapeId('geo'), parentId: editor.currentPageId }])

		expect(editor.userDocumentSettings.lastUsedTabId).toBe(TEST_INSTANCE_ID)
		expect(editor.userDocumentSettings.lastUpdatedPageId).toBe(editor.currentPageId)
	})
})
