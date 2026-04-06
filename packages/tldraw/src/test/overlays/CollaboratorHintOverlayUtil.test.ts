import { InstancePresenceRecordType } from '@tldraw/tlschema'
import { defaultOverlayUtils } from '../../lib/defaultOverlayUtils'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor({ overlayUtils: defaultOverlayUtils })
})

describe('CollaboratorHintOverlayUtil', () => {
	describe('isActive', () => {
		it('returns false when no collaborator cursors are off-screen', () => {
			const util = editor.overlays.getOverlayUtil('collaborator_hint')
			expect(util.isActive()).toBe(false)
		})

		it('returns true when a collaborator cursor is outside the viewport', () => {
			const pageId = editor.getCurrentPageId()
			// Place a cursor far off screen
			editor.store.put([
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('peer1'),
					userId: 'peer1',
					userName: 'Peer 1',
					currentPageId: pageId,
					cursor: { type: 'default', x: 100000, y: 100000, rotation: 0 },
				}),
			])
			const util = editor.overlays.getOverlayUtil('collaborator_hint')
			expect(util.isActive()).toBe(true)
		})
	})

	describe('getOverlays', () => {
		it('returns empty array when all collaborators are in viewport', () => {
			const util = editor.overlays.getOverlayUtil('collaborator_hint')
			expect(util.getOverlays()).toEqual([])
		})

		it('returns an overlay for each off-screen collaborator with correct props', () => {
			const pageId = editor.getCurrentPageId()
			editor.store.put([
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('peer1'),
					userId: 'peer1',
					userName: 'Peer 1',
					currentPageId: pageId,
					color: '#c00',
					cursor: { type: 'default', x: 100000, y: 100000, rotation: 0 },
				}),
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('peer2'),
					userId: 'peer2',
					userName: 'Peer 2',
					currentPageId: pageId,
					color: '#0c0',
					cursor: { type: 'default', x: -100000, y: -100000, rotation: 0 },
				}),
			])
			const util = editor.overlays.getOverlayUtil('collaborator_hint')
			const overlays = util.getOverlays()
			expect(overlays).toHaveLength(2)
			expect(overlays[0].props).toHaveProperty('rotation')
			expect(typeof overlays[0].props.rotation).toBe('number')
			expect(overlays.some((o: any) => o.props.color === '#c00')).toBe(true)
		})
	})
})
