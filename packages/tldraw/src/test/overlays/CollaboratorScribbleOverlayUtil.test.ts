import { InstancePresenceRecordType } from '@tldraw/tlschema'
import { defaultOverlayUtils } from '../../lib/defaultOverlayUtils'
import { CollaboratorScribbleOverlayUtil } from '../../lib/overlays/CollaboratorScribbleOverlayUtil'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor({ overlayUtils: defaultOverlayUtils })
})

describe('CollaboratorScribbleOverlayUtil', () => {
	describe('isActive', () => {
		it('returns false when no collaborators have scribbles', () => {
			const util =
				editor.overlays.getOverlayUtil<CollaboratorScribbleOverlayUtil>('collaborator_scribble')
			expect(util.isActive()).toBe(false)
		})

		it('returns true when any collaborator has scribbles', () => {
			const pageId = editor.getCurrentPageId()
			editor.store.put([
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('peer1'),
					userId: 'peer1',
					userName: 'Peer 1',
					currentPageId: pageId,
					scribbles: [
						{
							id: 's1',
							points: [{ x: 0, y: 0, z: 0.5 }],
							size: 8,
							taper: true,
							state: 'active',
							opacity: 1,
							color: 'white',
							delay: 0,
							shrink: 0,
						},
					],
				}),
			])
			const util =
				editor.overlays.getOverlayUtil<CollaboratorScribbleOverlayUtil>('collaborator_scribble')
			expect(util.isActive()).toBe(true)
		})
	})

	describe('getOverlays', () => {
		it('returns empty array when no collaborators have scribbles', () => {
			const util =
				editor.overlays.getOverlayUtil<CollaboratorScribbleOverlayUtil>('collaborator_scribble')
			expect(util.getOverlays()).toEqual([])
		})

		it('returns one overlay per scribble per collaborator and includes color', () => {
			const pageId = editor.getCurrentPageId()
			editor.store.put([
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('peer1'),
					userId: 'peer1',
					userName: 'Peer 1',
					currentPageId: pageId,
					color: '#00FF00',
					scribbles: [
						{
							id: 's1',
							points: [{ x: 0, y: 0, z: 0.5 }],
							size: 8,
							taper: true,
							state: 'active',
							opacity: 1,
							color: 'white',
							delay: 0,
							shrink: 0,
						},
						{
							id: 's2',
							points: [{ x: 1, y: 1, z: 0.5 }],
							size: 6,
							taper: false,
							state: 'complete',
							opacity: 0.5,
							color: 'laser',
							delay: 0,
							shrink: 0,
						},
					],
				}),
			])

			const util =
				editor.overlays.getOverlayUtil<CollaboratorScribbleOverlayUtil>('collaborator_scribble')
			const overlays = util.getOverlays()
			expect(overlays).toHaveLength(2)
			expect(overlays[0].props.color).toBe('#00FF00')
			expect(overlays[1].props.scribble.id).toBe('s2')
		})
	})
})
