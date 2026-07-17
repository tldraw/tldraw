import { defaultOverlayUtils } from '../../lib/defaultOverlayUtils'
import { BrushOverlayUtil } from '../../lib/overlays/BrushOverlayUtil'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor({ overlayUtils: defaultOverlayUtils })
})

describe('BrushOverlayUtil', () => {
	describe('isActive', () => {
		it('returns false when brush is null', () => {
			const util = editor.overlays.getOverlayUtil<BrushOverlayUtil>('brush')
			expect(util.isActive()).toBe(false)
		})

		it('returns true when brush is set', () => {
			editor.updateInstanceState({ brush: { x: 10, y: 20, w: 50, h: 40 } })
			const util = editor.overlays.getOverlayUtil<BrushOverlayUtil>('brush')
			expect(util.isActive()).toBe(true)
		})
	})

	describe('getOverlays', () => {
		it('returns empty array when brush is null', () => {
			const util = editor.overlays.getOverlayUtil<BrushOverlayUtil>('brush')
			expect(util.getOverlays()).toEqual([])
		})

		it('returns a single overlay with brush dimensions', () => {
			editor.updateInstanceState({ brush: { x: 5, y: 6, w: 10, h: 12 } })
			const util = editor.overlays.getOverlayUtil<BrushOverlayUtil>('brush')
			const overlays = util.getOverlays()
			expect(overlays).toHaveLength(1)
			expect(overlays[0]).toMatchObject({
				id: 'brush',
				type: 'brush',
				props: { x: 5, y: 6, w: 10, h: 12 },
			})
		})

		it('clamps width and height to minimum of 1', () => {
			editor.updateInstanceState({ brush: { x: 1, y: 2, w: 0, h: 0.2 } })
			const util = editor.overlays.getOverlayUtil<BrushOverlayUtil>('brush')
			const overlays = util.getOverlays()
			expect(overlays[0].props).toMatchObject({ w: 1, h: 1 })
		})
	})
})
