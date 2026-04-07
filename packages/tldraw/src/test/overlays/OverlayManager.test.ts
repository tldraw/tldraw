import { createShapeId } from '@tldraw/editor'
import { defaultOverlayUtils } from '../../lib/defaultOverlayUtils'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
}

beforeEach(() => {
	editor = new TestEditor({ overlayUtils: defaultOverlayUtils })
})

describe('OverlayManager', () => {
	describe('getCurrentOverlays', () => {
		it('returns empty array when no overlays are active', () => {
			expect(editor.overlays.getCurrentOverlays()).toEqual([])
		})

		it('returns overlays from active overlay utils and excludes inactive ones', () => {
			// Only brush will be active after setting brush
			editor.updateInstanceState({ brush: { x: 1, y: 2, w: 3, h: 4 } })
			const overlays = editor.overlays.getCurrentOverlays()
			expect(overlays.some((o) => o.type === 'brush')).toBe(true)
			expect(overlays.some((o) => o.type === 'zoom_brush')).toBe(false)
		})
	})

	describe('getOverlayAtPoint', () => {
		it('returns null when no interactive overlays exist', () => {
			expect(editor.overlays.getOverlayAtPoint({ x: 0, y: 0 })).toBeNull()
		})

		it('returns the overlay when point is inside its geometry', () => {
			// Create a shape and select it to enable selection foreground with handles
			editor.createShapes([
				{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			])
			editor.select(ids.box1)
			const overlays = editor.overlays.getCurrentOverlays()
			// Should include selection_foreground overlays
			const anyOverlay = overlays.find((o) => o.type === 'selection_foreground')
			expect(anyOverlay).toBeTruthy()
			const util = editor.overlays.getOverlayUtil(anyOverlay!)
			const geom = util.getGeometry(anyOverlay!)
			expect(geom).toBeTruthy()
			const center = geom!.bounds.center
			const hit = editor.overlays.getOverlayAtPoint(center)
			expect(hit).toBeTruthy()
		})

		it('returns null when point is outside all overlay geometries', () => {
			editor.createShapes([
				{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			])
			editor.select(ids.box1)
			const miss = editor.overlays.getOverlayAtPoint({ x: -1000, y: -1000 })
			expect(miss).toBeNull()
		})

		it('respects margin parameter for unfilled geometries (edge handles)', () => {
			editor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }])
			editor.select(ids.box1)
			// Point near the top edge but slightly outside
			const nearTop = { x: 50, y: -5 }
			// With zero margin, should miss
			expect(editor.overlays.getOverlayAtPoint(nearTop, 0)).toBeNull()
			// With margin, should hit the top edge overlay
			const hit = editor.overlays.getOverlayAtPoint(nearTop, 10)
			expect(hit?.id).toBe('selection_fg:top')
		})

		it('returns first matching overlay when multiple overlap (corner)', () => {
			editor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }])
			editor.select(ids.box1)
			// At the exact corner, both corner and edges overlap; expect corner first
			const hit = editor.overlays.getOverlayAtPoint({ x: 0, y: 0 }, 6)
			expect(hit?.id).toBe('selection_fg:top_left')
		})

		it('skips overlays that have no geometry (non-interactive)', () => {
			// Make scribbles active but with no selection
			editor.updateInstanceState({
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
			})
			expect(editor.overlays.getOverlayAtPoint({ x: 0, y: 0 })).toBeNull()
		})
	})

	describe('hovered overlay', () => {
		it('manages hovered overlay id and lookup', () => {
			expect(editor.overlays.getHoveredOverlayId()).toBeNull()
			editor.overlays.setHoveredOverlay('foo')
			expect(editor.overlays.getHoveredOverlayId()).toBe('foo')
			// Not found overlay returns null
			expect(editor.overlays.getHoveredOverlay()).toBeNull()
		})
	})
})
