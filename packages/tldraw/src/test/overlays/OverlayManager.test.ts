import { Circle2d, createShapeId, Geometry2d, OverlayUtil, TLOverlay, Vec } from '@tldraw/editor'
import { vi } from 'vitest'
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

	describe('getOverlayGeometry', () => {
		it('returns the same geometry instance across consecutive calls for the same overlay', () => {
			editor.createShapes([
				{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			])
			editor.select(ids.box1)
			const overlay = editor.overlays
				.getCurrentOverlays()
				.find((o) => o.type === 'selection_foreground')
			expect(overlay).toBeTruthy()
			const first = editor.overlays.getOverlayGeometry(overlay!)
			const second = editor.overlays.getOverlayGeometry(overlay!)
			expect(first).toBeTruthy()
			expect(second).toBe(first)
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

	describe('zIndex ordering', () => {
		const makeOverlappingUtil = (type: string, zIndex: number) => {
			class TestOverlay extends OverlayUtil<TLOverlay<{ zIndex: number }>> {
				static override type = type
				override options = { zIndex }
				override isActive() {
					return true
				}
				override getOverlays() {
					return [{ id: `${type}:o`, type, props: { zIndex } }]
				}
				override getGeometry(): Geometry2d {
					return new Circle2d({ x: -10, y: -10, radius: 10, isFilled: true })
				}
			}
			return TestOverlay
		}

		it('returns utils sorted by zIndex, registration order breaks ties', () => {
			const LowA = makeOverlappingUtil('low_a', 10)
			const LowB = makeOverlappingUtil('low_b', 10)
			const High = makeOverlappingUtil('high', 100)
			const editor = new TestEditor({ overlayUtils: [High, LowA, LowB] })
			const types = editor.overlays.getOverlayUtilsInZOrder().map((u) => u.constructor.name)
			// Sorted by zIndex asc; LowA before LowB (registration); High last.
			expect(types).toEqual(['TestOverlay', 'TestOverlay', 'TestOverlay'])
			const zs = editor.overlays.getOverlayUtilsInZOrder().map((u) => u.options.zIndex)
			expect(zs).toEqual([10, 10, 100])
			const ids = editor.overlays.getCurrentOverlays().map((o) => o.id)
			expect(ids).toEqual(['low_a:o', 'low_b:o', 'high:o'])
		})

		it('topmost util wins hit-test when geometries overlap', () => {
			const Low = makeOverlappingUtil('low', 10)
			const High = makeOverlappingUtil('high', 100)
			// Register low last so registration order would have returned low first
			// under the old behavior.
			const editor = new TestEditor({ overlayUtils: [High, Low] })
			const hit = editor.overlays.getOverlayAtPoint(new Vec(0, 0))
			expect(hit?.type).toBe('high')
		})
	})

	describe('onPointerDown interrupt', () => {
		const makeHitUtil = (
			type: string,
			onPointerDown?: (overlay: TLOverlay, info: any) => boolean | void
		) => {
			class TestOverlay extends OverlayUtil<TLOverlay<Record<string, never>>> {
				static override type = type
				override options = { zIndex: 1000 }
				override isActive() {
					return true
				}
				override getOverlays() {
					return [{ id: `${type}:o`, type, props: {} }]
				}
				override getGeometry(): Geometry2d {
					return new Circle2d({ x: -10, y: -10, radius: 10, isFilled: true })
				}
				override onPointerDown = onPointerDown
			}
			return TestOverlay
		}

		it('calls util.onPointerDown when an overlay is hit', () => {
			const spy = vi.fn()
			const Util = makeHitUtil('tester', spy)
			const editor = new TestEditor({ overlayUtils: [Util] })
			editor.pointerMove(0, 0).pointerDown(0, 0)
			expect(spy).toHaveBeenCalledTimes(1)
			expect(spy.mock.calls[0][0].id).toBe('tester:o')
		})

		it('skips default routing when onPointerDown returns a non-false value', () => {
			const Util = makeHitUtil('tester', () => true)
			const editor = new TestEditor({ overlayUtils: [Util] })
			editor.pointerMove(0, 0).pointerDown(0, 0)
			editor.expectToBeIn('select.idle')
		})

		it('skips default routing when onPointerDown returns undefined', () => {
			const Util = makeHitUtil('tester', () => {})
			const editor = new TestEditor({ overlayUtils: [Util] })
			editor.pointerMove(0, 0).pointerDown(0, 0)
			editor.expectToBeIn('select.idle')
		})

		it('runs default routing when onPointerDown returns false', () => {
			const Util = makeHitUtil('tester', () => false)
			const editor = new TestEditor({ overlayUtils: [Util] })
			editor.pointerMove(0, 0).pointerDown(0, 0)
			editor.expectToBeIn('select.pointing_selection')
		})

		it('runs default routing when onPointerDown is not defined', () => {
			const Util = makeHitUtil('tester')
			const editor = new TestEditor({ overlayUtils: [Util] })
			editor.pointerMove(0, 0).pointerDown(0, 0)
			editor.expectToBeIn('select.pointing_selection')
		})
	})

	describe('getActiveOverlayEntries', () => {
		const makeUtil = (
			type: string,
			zIndex: number,
			{ active = true, empty = false }: { active?: boolean; empty?: boolean } = {}
		) => {
			class TestOverlay extends OverlayUtil<TLOverlay<{ zIndex: number }>> {
				static override type = type
				override options = { zIndex }
				override isActive() {
					return active
				}
				override getOverlays() {
					return empty ? [] : [{ id: `${type}:o`, type, props: { zIndex } }]
				}
			}
			return TestOverlay
		}

		it('returns entries in paint order, skipping inactive utils but keeping active empty utils so they can render non-interactive UI', () => {
			const High = makeUtil('high', 100)
			const Mid = makeUtil('mid', 50)
			const Low = makeUtil('low', 10)
			const Inactive = makeUtil('inactive', 75, { active: false })
			const Empty = makeUtil('empty', 25, { empty: true })
			const editor = new TestEditor({ overlayUtils: [High, Inactive, Mid, Empty, Low] })
			const entries = editor.overlays.getActiveOverlayEntries()
			expect(entries.map((e) => (e.util.constructor as typeof OverlayUtil).type)).toEqual([
				'low',
				'empty',
				'mid',
				'high',
			])
			const emptyEntry = entries.find(
				(e) => (e.util.constructor as typeof OverlayUtil).type === 'empty'
			)
			expect(emptyEntry?.overlays).toEqual([])
		})
	})
})
