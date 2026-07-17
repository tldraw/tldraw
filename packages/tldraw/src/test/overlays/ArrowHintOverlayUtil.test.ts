import { ArrowShapeKindStyle, createShapeId } from '@tldraw/editor'
import { defaultOverlayUtils } from '../../lib/defaultOverlayUtils'
import { ArrowHintOverlayUtil } from '../../lib/overlays/ArrowHintOverlayUtil'
import { updateArrowTargetState } from '../../lib/shapes/arrow/arrowTargetState'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	arrow1: createShapeId('arrow1'),
}

beforeEach(() => {
	editor = new TestEditor({ overlayUtils: defaultOverlayUtils })
})

describe('ArrowHintOverlayUtil', () => {
	describe('isActive', () => {
		it('returns false in select.idle', () => {
			const util = editor.overlays.getOverlayUtil<ArrowHintOverlayUtil>('arrow_hint')
			expect(util.isActive()).toBe(false)
		})

		it('returns true in arrow.idle', () => {
			editor.setCurrentTool('arrow')
			const util = editor.overlays.getOverlayUtil<ArrowHintOverlayUtil>('arrow_hint')
			expect(util.isActive()).toBe(true)
		})

		it('returns true in arrow.pointing', () => {
			editor.setCurrentTool('arrow')
			editor.pointerDown(0, 0, { target: 'canvas' })
			const util = editor.overlays.getOverlayUtil<ArrowHintOverlayUtil>('arrow_hint')
			expect(util.isActive()).toBe(true)
			editor.pointerUp()
		})
	})

	describe('getOverlays', () => {
		it('returns empty array when there is no arrow target', () => {
			const util = editor.overlays.getOverlayUtil<ArrowHintOverlayUtil>('arrow_hint')
			expect(util.getOverlays()).toEqual([])
		})

		it('returns an overlay with target shape id and edge handles', () => {
			// Create a target shape, then manually update arrow target state
			editor.createShapes([
				{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			])
			// Use elbow kind to enable edge snaps, but any kind should create an overlay
			editor.setStyleForNextShapes(ArrowShapeKindStyle, 'elbow')
			updateArrowTargetState({
				editor,
				pointInPageSpace: { x: 120, y: 120 },
				arrow: undefined,
				isPrecise: false,
				currentBinding: undefined,
				oppositeBinding: undefined,
			})
			const util = editor.overlays.getOverlayUtil<ArrowHintOverlayUtil>('arrow_hint')
			const overlays = util.getOverlays()
			expect(overlays).toHaveLength(1)
			expect(overlays[0].props).toHaveProperty('targetId')
			expect(overlays[0].props).toHaveProperty('handles')
		})

		it('sets showEdgeHints to true for non-exact elbow arrows', () => {
			// elbow + not exact (alt not held) => showEdgeHints
			editor.createShapes([
				{ id: ids.box1, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } },
			])
			editor.setStyleForNextShapes(ArrowShapeKindStyle, 'elbow')
			editor.inputs.setAltKey(false)
			updateArrowTargetState({
				editor,
				pointInPageSpace: { x: 220, y: 220 },
				arrow: undefined,
				isPrecise: false,
				currentBinding: undefined,
				oppositeBinding: undefined,
			})
			const util = editor.overlays.getOverlayUtil<ArrowHintOverlayUtil>('arrow_hint')
			const overlay = util.getOverlays()[0]
			expect(overlay.props.showEdgeHints).toBe(true)
		})

		it('sets showEdgeHints to false for exact arrows', () => {
			// exact when alt is held (per default shouldBeExact)
			editor.createShapes([
				{ id: createShapeId('b2'), type: 'geo', x: 350, y: 200, props: { w: 100, h: 100 } },
			])
			editor.setStyleForNextShapes(ArrowShapeKindStyle, 'elbow')
			editor.inputs.setAltKey(true)
			updateArrowTargetState({
				editor,
				pointInPageSpace: { x: 360, y: 210 },
				arrow: undefined,
				isPrecise: false,
				currentBinding: undefined,
				oppositeBinding: undefined,
			})
			const util = editor.overlays.getOverlayUtil<ArrowHintOverlayUtil>('arrow_hint')
			const overlay = util.getOverlays()[0]
			expect(overlay.props.showEdgeHints).toBe(false)
		})

		it('sets showEdgeHints to false for non-elbow arrows', () => {
			// kind arc => no edge hints
			editor.createShapes([
				{ id: createShapeId('b3'), type: 'geo', x: 500, y: 200, props: { w: 100, h: 100 } },
			])
			editor.setStyleForNextShapes(ArrowShapeKindStyle, 'arc')
			editor.inputs.setAltKey(false)
			updateArrowTargetState({
				editor,
				pointInPageSpace: { x: 520, y: 220 },
				arrow: undefined,
				isPrecise: false,
				currentBinding: undefined,
				oppositeBinding: undefined,
			})
			const util = editor.overlays.getOverlayUtil<ArrowHintOverlayUtil>('arrow_hint')
			const overlay = util.getOverlays()[0]
			expect(overlay.props.showEdgeHints).toBe(false)
		})
	})
})
