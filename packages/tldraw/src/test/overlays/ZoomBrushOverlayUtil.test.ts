import { defaultOverlayUtils } from '../../lib/defaultOverlayUtils'
import { ZoomBrushOverlayUtil } from '../../lib/overlays/ZoomBrushOverlayUtil'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor({ overlayUtils: defaultOverlayUtils })
})

describe('ZoomBrushOverlayUtil', () => {
	describe('isActive', () => {
		it('returns false when zoomBrush is null', () => {
			const util = editor.overlays.getOverlayUtil<ZoomBrushOverlayUtil>('zoom_brush')
			expect(util.isActive()).toBe(false)
		})

		it('returns true when zoomBrush is set', () => {
			editor.updateInstanceState({ zoomBrush: { x: 1, y: 2, w: 3, h: 4 } })
			const util = editor.overlays.getOverlayUtil<ZoomBrushOverlayUtil>('zoom_brush')
			expect(util.isActive()).toBe(true)
		})
	})

	describe('getOverlays', () => {
		it('returns empty array when zoomBrush is null', () => {
			const util = editor.overlays.getOverlayUtil<ZoomBrushOverlayUtil>('zoom_brush')
			expect(util.getOverlays()).toEqual([])
		})

		it('returns a single overlay with zoom brush dimensions', () => {
			editor.updateInstanceState({ zoomBrush: { x: 5, y: 6, w: 10, h: 12 } })
			const util = editor.overlays.getOverlayUtil<ZoomBrushOverlayUtil>('zoom_brush')
			const overlays = util.getOverlays()
			expect(overlays).toHaveLength(1)
			expect(overlays[0]).toMatchObject({
				id: 'zoom_brush',
				type: 'zoom_brush',
				props: { x: 5, y: 6, w: 10, h: 12 },
			})
		})

		it('clamps width and height to minimum of 1', () => {
			editor.updateInstanceState({ zoomBrush: { x: 1, y: 2, w: 0, h: 0.2 } })
			const util = editor.overlays.getOverlayUtil<ZoomBrushOverlayUtil>('zoom_brush')
			const overlays = util.getOverlays()
			expect(overlays[0].props).toMatchObject({ w: 1, h: 1 })
		})
	})
})
