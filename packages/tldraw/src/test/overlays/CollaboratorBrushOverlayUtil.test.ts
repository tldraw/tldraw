import { InstancePresenceRecordType } from '@tldraw/tlschema'
import { defaultOverlayUtils } from '../../lib/defaultOverlayUtils'
import { CollaboratorBrushOverlayUtil } from '../../lib/overlays/CollaboratorBrushOverlayUtil'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor({ overlayUtils: defaultOverlayUtils })
})

describe('CollaboratorBrushOverlayUtil', () => {
	describe('isActive', () => {
		it('returns false when no collaborators have a brush', () => {
			const util =
				editor.overlays.getOverlayUtil<CollaboratorBrushOverlayUtil>('collaborator_brush')
			expect(util.isActive()).toBe(false)
		})

		it('returns true when any collaborator has a brush', () => {
			const pageId = editor.getCurrentPageId()
			editor.store.put([
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('peer1'),
					userId: 'peer1',
					userName: 'Peer 1',
					currentPageId: pageId,
					brush: { x: 1, y: 2, w: 3, h: 4 },
				}),
			])
			const util =
				editor.overlays.getOverlayUtil<CollaboratorBrushOverlayUtil>('collaborator_brush')
			expect(util.isActive()).toBe(true)
		})
	})

	describe('getOverlays', () => {
		it('returns empty array when no collaborators have a brush', () => {
			const util =
				editor.overlays.getOverlayUtil<CollaboratorBrushOverlayUtil>('collaborator_brush')
			expect(util.getOverlays()).toEqual([])
		})

		it('returns an overlay per collaborator with an active brush and clamps dimensions', () => {
			const pageId = editor.getCurrentPageId()
			editor.store.put([
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('peer1'),
					userId: 'peer1',
					userName: 'Peer 1',
					currentPageId: pageId,
					color: '#123456',
					brush: { x: 0, y: 0, w: 0, h: 0 },
				}),
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('peer2'),
					userId: 'peer2',
					userName: 'Peer 2',
					currentPageId: pageId,
					color: '#abcdef',
					brush: { x: 5, y: 6, w: 10, h: 12 },
				}),
			])
			const util =
				editor.overlays.getOverlayUtil<CollaboratorBrushOverlayUtil>('collaborator_brush')
			const overlays = util.getOverlays()
			expect(overlays).toHaveLength(2)
			expect(overlays.find((o) => o.props.color === '#123456')!.props).toMatchObject({
				w: 1,
				h: 1,
			})
			expect(overlays.find((o) => o.props.color === '#abcdef')!.props).toMatchObject({
				x: 5,
				y: 6,
				w: 10,
				h: 12,
			})
		})
	})
})
