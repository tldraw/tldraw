import { createShapeId } from '@tldraw/editor'
import { defaultOverlayUtils } from '../../lib/defaultOverlayUtils'
import { SelectToolShapeIndicatorOverlayUtil } from '../../lib/overlays/SelectToolShapeIndicatorOverlayUtil'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
}

beforeEach(() => {
	editor = new TestEditor({ overlayUtils: defaultOverlayUtils })
	editor.createShapes([
		{ id: ids.box1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
		{ id: ids.box2, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } },
	])
})

function getUtil() {
	return editor.overlays.getOverlayUtil<SelectToolShapeIndicatorOverlayUtil>('shape_indicator')
}

describe('SelectToolShapeIndicatorOverlayUtil', () => {
	describe('shouldShowSelectionIndicators', () => {
		it('is true while idle', () => {
			expect(editor.isIn('select.idle')).toBe(true)
			expect(getUtil().shouldShowSelectionIndicators()).toBe(true)
		})

		it('is true while editing a shape', () => {
			editor.doubleClick(50, 50, { target: 'shape', shape: editor.getShape(ids.box1)! })
			expect(editor.isIn('select.editing_shape')).toBe(true)
			expect(getUtil().shouldShowSelectionIndicators()).toBe(true)
		})

		it('is true while brushing', () => {
			editor.pointerDown(400, 400).pointerMove(420, 420)
			expect(editor.isIn('select.brushing')).toBe(true)
			expect(getUtil().shouldShowSelectionIndicators()).toBe(true)
		})

		it('is false while a different tool is active', () => {
			editor.setCurrentTool('draw')
			expect(getUtil().shouldShowSelectionIndicators()).toBe(false)
		})
	})

	describe('shouldShowHoverIndicator', () => {
		it('is true while idle', () => {
			expect(getUtil().shouldShowHoverIndicator()).toBe(true)
		})

		it('is true while editing a shape', () => {
			editor.doubleClick(50, 50, { target: 'shape', shape: editor.getShape(ids.box1)! })
			expect(editor.isIn('select.editing_shape')).toBe(true)
			expect(getUtil().shouldShowHoverIndicator()).toBe(true)
		})

		it('is false while brushing, so hover indicators do not flicker during a drag', () => {
			editor.pointerDown(400, 400).pointerMove(420, 420)
			expect(editor.isIn('select.brushing')).toBe(true)
			expect(getUtil().shouldShowHoverIndicator()).toBe(false)
		})
	})

	describe('getOverlays', () => {
		it('includes selected shapes while idle', () => {
			editor.select(ids.box1)
			const overlays = getUtil().getOverlays()
			expect(overlays).toHaveLength(1)
			expect(overlays[0].props.idsToDisplay).toContain(ids.box1)
		})

		it('includes the hovered shape while idle with a fine pointer', () => {
			editor.updateInstanceState({ isHoveringCanvas: true, isCoarsePointer: false })
			editor.setHoveredShape(ids.box1)
			expect(getUtil().getOverlays()[0]?.props.idsToDisplay).toContain(ids.box1)
		})

		it('excludes the hovered shape with a coarse pointer', () => {
			editor.updateInstanceState({ isHoveringCanvas: true, isCoarsePointer: true })
			editor.setHoveredShape(ids.box1)
			expect(getUtil().getOverlays()).toEqual([])
		})
	})
})
