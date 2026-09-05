import {
	InstancePresenceRecordType,
	PageRecordType,
	TLPageId,
	createShapeId,
	createUserId,
} from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

afterEach(() => {
	editor.dispose()
})

describe('zoomToUser', () => {
	it('records a cross-page jump as its own undo step', () => {
		const page1Id = editor.getCurrentPageId()
		const page2Id: TLPageId = PageRecordType.createId()
		const boxId = createShapeId()
		const userId = createUserId('other')

		// Set up the second page and the collaborator outside of history so the only undoable
		// steps are the ones the test creates: one edit on page 1, then the jump to page 2.
		editor.run(
			() => {
				editor.createPage({ id: page2Id, name: 'Page 2' })
				editor.store.put([
					InstancePresenceRecordType.create({
						id: InstancePresenceRecordType.createId(userId),
						userId,
						userName: 'other',
						currentPageId: page2Id,
						cursor: { x: 100, y: 100, type: 'default', rotation: 0 },
						camera: { x: 0, y: 0, z: 1 },
						screenBounds: { x: 0, y: 0, w: 1080, h: 720 },
						lastActivityTimestamp: Date.now(),
					}),
				])
			},
			{ history: 'ignore' }
		)
		editor.clearHistory()

		editor.markHistoryStoppingPoint('create box')
		editor.createShapes([{ id: boxId, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }])

		editor.zoomToUser(userId)
		expect(editor.getCurrentPageId()).toBe(page2Id)

		// The first undo only takes us back to page 1; the edit made there is still intact.
		editor.undo()
		expect(editor.getCurrentPageId()).toBe(page1Id)
		expect(editor.getShape(boxId)).toBeDefined()

		editor.undo()
		expect(editor.getShape(boxId)).toBeUndefined()
	})
})
