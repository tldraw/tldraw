import { InstancePresenceRecordType, TLUserId, createUserId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('When following a user', () => {
	it('keeps following a leader whose own leader is missing', () => {
		const pageId = editor.getCurrentPageId()
		const leaderId = createUserId('leader')
		const leadersLeaderId = createUserId('leaders-leader')
		const presence = (userId: TLUserId, followingUserId: TLUserId | null) =>
			InstancePresenceRecordType.create({
				id: InstancePresenceRecordType.createId(userId),
				userId,
				userName: userId,
				currentPageId: pageId,
				followingUserId,
				camera: { x: 0, y: 0, z: 1 },
				screenBounds: { x: 0, y: 0, w: 1080, h: 720 },
				lastActivityTimestamp: Date.now(),
			})

		// the leader follows someone whose presence we don't have
		editor.store.put([presence(leaderId, leadersLeaderId)])
		editor.startFollowingUser(leaderId)
		expect(editor.getInstanceState().followingUserId).toBe(leaderId)

		// the leader's leader shows up, then leaves again
		editor.store.put([presence(leadersLeaderId, null)])
		expect(editor.getInstanceState().followingUserId).toBe(leaderId)
		editor.store.remove([InstancePresenceRecordType.createId(leadersLeaderId)])
		expect(editor.getInstanceState().followingUserId).toBe(leaderId)
	})

	it.todo('starts following a user')
	it.todo('stops following a user')
	it.todo('stops following a user when the camera changes due to user action')
	it.todo('moves the camera to follow the user without unfollowing them')
	it.todo('stops any animations while following')
	it.todo('stops following a user when the page changes due to user action')
	it.todo('follows a user to another page without unfollowing them')
})
