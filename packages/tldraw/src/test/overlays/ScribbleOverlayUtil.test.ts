import { defaultOverlayUtils } from '../../lib/defaultOverlayUtils'
import { ScribbleOverlayUtil } from '../../lib/overlays/ScribbleOverlayUtil'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor({ overlayUtils: defaultOverlayUtils })
})

describe('ScribbleOverlayUtil', () => {
	describe('isActive', () => {
		it('returns false when there are no scribbles', () => {
			const util = editor.overlays.getOverlayUtil<ScribbleOverlayUtil>('scribble')
			expect(util.isActive()).toBe(false)
		})

		it('returns true when scribbles exist', () => {
			editor.updateInstanceState({
				scribbles: [
					{
						id: 's1',
						points: [{ x: 0, y: 0, z: 0.5 }],
						size: 8,
						taper: true,
						state: 'active',
						opacity: 1,
						delay: 0,
						shrink: 0,
						color: 'accent',
					},
				],
			})
			const util = editor.overlays.getOverlayUtil<ScribbleOverlayUtil>('scribble')
			expect(util.isActive()).toBe(true)
		})
	})

	describe('getOverlays', () => {
		it('returns empty array when no scribbles exist', () => {
			const util = editor.overlays.getOverlayUtil<ScribbleOverlayUtil>('scribble')
			expect(util.getOverlays()).toEqual([])
		})

		it('returns one overlay per scribble and includes scribble data', () => {
			editor.updateInstanceState({
				scribbles: [
					{
						id: 's1',
						points: [{ x: 0, y: 0, z: 0.5 }],
						size: 8,
						taper: true,
						state: 'active',
						opacity: 0.5,
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
						opacity: 1,
						color: 'laser',
						delay: 0,
						shrink: 0,
					},
				],
			})
			const util = editor.overlays.getOverlayUtil<ScribbleOverlayUtil>('scribble')
			const overlays = util.getOverlays()
			expect(overlays).toHaveLength(2)
			expect(overlays[0].props.scribble.id).toBe('s1')
			expect(overlays[1].props.scribble.id).toBe('s2')
		})
	})
})
