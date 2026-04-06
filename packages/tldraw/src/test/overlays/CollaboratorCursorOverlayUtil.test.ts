import { InstancePresenceRecordType } from '@tldraw/tlschema'
import { defaultOverlayUtils } from '../../lib/defaultOverlayUtils'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor({ overlayUtils: defaultOverlayUtils })
})

describe('CollaboratorCursorOverlayUtil', () => {
	describe('isActive', () => {
		it('returns false when there are no collaborators on the page', () => {
			const util = editor.overlays.getOverlayUtil('collaborator_cursor')
			expect(util.isActive()).toBe(false)
		})

		it('returns true when collaborators are present', () => {
			const pageId = editor.getCurrentPageId()
			editor.store.put([
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('peer1'),
					userId: 'peer1',
					userName: 'Peer 1',
					currentPageId: pageId,
					cursor: { type: 'default', x: 10, y: 10, rotation: 0 },
					lastActivityTimestamp: Date.now(),
				}),
			])
			const util = editor.overlays.getOverlayUtil('collaborator_cursor')
			expect(util.isActive()).toBe(true)
		})
	})

	describe('getOverlays', () => {
		it('returns empty array when no collaborators are present', () => {
			const util = editor.overlays.getOverlayUtil('collaborator_cursor')
			expect(util.getOverlays()).toEqual([])
		})

		it('returns an overlay per visible collaborator cursor', () => {
			const pageId = editor.getCurrentPageId()
			editor.store.put([
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('peer1'),
					userId: 'peer1',
					userName: 'Alice',
					currentPageId: pageId,
					color: '#a',
					cursor: { type: 'default', x: 10, y: 10, rotation: 0 },
					lastActivityTimestamp: Date.now(),
				}),
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('peer2'),
					userId: 'peer2',
					userName: 'Bob',
					currentPageId: pageId,
					color: '#b',
					cursor: { type: 'default', x: 20, y: 20, rotation: 0 },
					lastActivityTimestamp: Date.now(),
				}),
			])
			const util = editor.overlays.getOverlayUtil('collaborator_cursor')
			const overlays = util.getOverlays()
			expect(overlays).toHaveLength(2)
			expect(overlays[0].props).toHaveProperty('x')
			expect(overlays[0].props).toHaveProperty('y')
		})

		it('excludes cursors outside the viewport', () => {
			const pageId = editor.getCurrentPageId()
			editor.store.put([
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('peer3'),
					userId: 'peer3',
					userName: 'Carol',
					currentPageId: pageId,
					color: '#c',
					cursor: { type: 'default', x: 999999, y: 999999, rotation: 0 },
					lastActivityTimestamp: Date.now(),
				}),
			])
			const util = editor.overlays.getOverlayUtil('collaborator_cursor')
			expect(util.getOverlays().length).toBe(0)
		})

		it('filters inactive vs idle vs active appropriately', () => {
			const pageId = editor.getCurrentPageId()
			const now = Date.now()
			editor.store.put([
				// inactive (way past timeout) — not shown
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('p_inactive'),
					userId: 'p_inactive',
					userName: 'Inactive',
					currentPageId: pageId,
					cursor: { type: 'default', x: 10, y: 10, rotation: 0 },
					lastActivityTimestamp: now - 10 * 60 * 1000,
				}),
				// idle (between thresholds) — shown
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('p_idle'),
					userId: 'p_idle',
					userName: 'Idle',
					currentPageId: pageId,
					cursor: { type: 'default', x: 15, y: 15, rotation: 0 },
					lastActivityTimestamp: now - 5 * 1000,
				}),
				// active — shown
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('p_active'),
					userId: 'p_active',
					userName: 'Active',
					currentPageId: pageId,
					cursor: { type: 'default', x: 20, y: 20, rotation: 0 },
					lastActivityTimestamp: now,
				}),
			])
			const util = editor.overlays.getOverlayUtil('collaborator_cursor')
			const overlays = util.getOverlays()
			// 2 visible (idle + active)
			expect(overlays.length).toBe(2)
		})

		it('shows inactive collaborators when following them', () => {
			const pageId = editor.getCurrentPageId()
			editor.updateInstanceState({ followingUserId: 'peerF' })
			const now = Date.now()
			editor.store.put([
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('presenceF'),
					userId: 'peerF',
					userName: 'Followed',
					currentPageId: pageId,
					cursor: { type: 'default', x: 10, y: 10, rotation: 0 },
					lastActivityTimestamp: now - 10 * 60 * 1000,
				}),
			])
			const overlays = editor.overlays.getOverlayUtil('collaborator_cursor').getOverlays()
			expect(overlays.length).toBe(1)
		})

		it('shows inactive collaborators when they are highlighted', () => {
			const pageId = editor.getCurrentPageId()
			editor.updateInstanceState({ highlightedUserIds: ['peerH'] })
			const now = Date.now()
			editor.store.put([
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('presenceH'),
					userId: 'peerH',
					userName: 'Highlighted',
					currentPageId: pageId,
					cursor: { type: 'default', x: 20, y: 20, rotation: 0 },
					lastActivityTimestamp: now - 10 * 60 * 1000,
				}),
			])
			const overlays = editor.overlays.getOverlayUtil('collaborator_cursor').getOverlays()
			expect(overlays.length).toBeGreaterThanOrEqual(1)
		})

		it('hides idle collaborators that are following us', () => {
			const pageId = editor.getCurrentPageId()
			const now = Date.now()
			editor.store.put([
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('presenceFU'),
					userId: 'peerFU',
					userName: 'Follower',
					currentPageId: pageId,
					cursor: { type: 'default', x: 30, y: 30, rotation: 0 },
					lastActivityTimestamp: now - 5 * 1000,
					followingUserId: editor.user.getId(),
				}),
			])
			const overlays = editor.overlays.getOverlayUtil('collaborator_cursor').getOverlays()
			expect(overlays.length).toBe(0)
		})

		it('shows idle following collaborators that have a chat message', () => {
			const pageId = editor.getCurrentPageId()
			const now = Date.now()
			editor.store.put([
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('presenceChat'),
					userId: 'peerChat',
					userName: 'Follower Chat',
					currentPageId: pageId,
					cursor: { type: 'default', x: 40, y: 40, rotation: 0 },
					lastActivityTimestamp: now - 5 * 1000,
					followingUserId: editor.user.getId(),
					chatMessage: 'Hello',
				}),
			])
			const overlays = editor.overlays.getOverlayUtil('collaborator_cursor').getOverlays()
			expect(overlays.length).toBe(1)
		})

		it('uses null name for "New User" collaborators', () => {
			const pageId = editor.getCurrentPageId()
			editor.store.put([
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('peer4'),
					userId: 'peer4',
					userName: 'New User',
					currentPageId: pageId,
					cursor: { type: 'default', x: 10, y: 10, rotation: 0 },
					lastActivityTimestamp: Date.now(),
				}),
			])
			const util = editor.overlays.getOverlayUtil('collaborator_cursor')
			const overlay = util.getOverlays()[0]
			expect(overlay.props.name).toBeNull()
		})
	})
})
