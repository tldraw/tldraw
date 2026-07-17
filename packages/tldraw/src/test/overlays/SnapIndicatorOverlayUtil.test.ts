import { defaultOverlayUtils } from '../../lib/defaultOverlayUtils'
import { SnapIndicatorOverlayUtil } from '../../lib/overlays/SnapIndicatorOverlayUtil'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor({ overlayUtils: defaultOverlayUtils })
})

describe('SnapIndicatorOverlayUtil', () => {
	describe('isActive', () => {
		it('returns false when there are no snap indicators', () => {
			const util = editor.overlays.getOverlayUtil<SnapIndicatorOverlayUtil>('snap_indicator')
			expect(util.isActive()).toBe(false)
		})

		it('returns true when snap indicators exist', () => {
			editor.snaps.setIndicators([
				{
					id: 'p1',
					type: 'points',
					points: [
						{ x: 0, y: 0 },
						{ x: 10, y: 10 },
					],
				},
			])
			const util = editor.overlays.getOverlayUtil<SnapIndicatorOverlayUtil>('snap_indicator')
			expect(util.isActive()).toBe(true)
		})
	})

	describe('getOverlays', () => {
		it('returns empty array when no indicators exist', () => {
			const util = editor.overlays.getOverlayUtil<SnapIndicatorOverlayUtil>('snap_indicator')
			expect(util.getOverlays()).toEqual([])
		})

		it('returns one overlay per snap indicator and includes data', () => {
			editor.snaps.setIndicators([
				{
					id: 'p1',
					type: 'points',
					points: [
						{ x: 0, y: 0 },
						{ x: 10, y: 10 },
					],
				},
				{
					id: 'g1',
					type: 'gaps',
					direction: 'horizontal',
					gaps: [
						{
							startEdge: [
								{ x: 0, y: 0 },
								{ x: 0, y: 10 },
							],
							endEdge: [
								{ x: 10, y: 0 },
								{ x: 10, y: 10 },
							],
						},
					],
				},
			])
			const util = editor.overlays.getOverlayUtil<SnapIndicatorOverlayUtil>('snap_indicator')
			const overlays = util.getOverlays()
			expect(overlays).toHaveLength(2)
			expect(overlays[0].props.line.id).toBeDefined()
		})
	})
})
