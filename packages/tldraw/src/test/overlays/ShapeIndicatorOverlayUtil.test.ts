import { createShapeId } from '@tldraw/editor'
import { defaultOverlayUtils } from '../../lib/defaultOverlayUtils'
import { ShapeIndicatorOverlayUtil } from '../../lib/overlays/ShapeIndicatorOverlayUtil'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
}

beforeEach(() => {
	editor = new TestEditor({ overlayUtils: defaultOverlayUtils })
})

describe('ShapeIndicatorOverlayUtil', () => {
	describe('getOverlays', () => {
		it.each(['top_left', 'top_left_rotate'] as const)(
			'keeps selected shape indicators visible while pointing the %s selection handle',
			(handle) => {
				editor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }])
				editor.select(ids.box1)
				editor.pointerDown(0, 0, { target: 'selection', handle })

				const util = editor.overlays.getOverlayUtil<ShapeIndicatorOverlayUtil>('shape_indicator')
				expect(util.getOverlays()).toMatchObject([
					{
						id: 'shape_indicator',
						type: 'shape_indicator',
						props: { idsToDisplay: [ids.box1] },
					},
				])
			}
		)
	})
})
