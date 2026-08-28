import { Box, Editor, TLGeoShape, createShapeId } from '@tldraw/editor'
import { afterEach, describe, expect, it } from 'vitest'
import { createHeadlessEditor } from '../lib/createHeadlessEditor'

const editors: Editor[] = []
function makeEditor(opts: Parameters<typeof createHeadlessEditor>[0] = {}) {
	const editor = createHeadlessEditor({ frameLoop: 'manual', ...opts })
	editors.push(editor)
	return editor
}

afterEach(() => {
	for (const editor of editors.splice(0)) editor.dispose()
})

describe('screenToPage / pageToScreen', () => {
	it('are identity transforms at the default camera (0, 0, 1)', () => {
		const editor = makeEditor()
		expect(editor.screenToPage({ x: 100, y: 200 })).toMatchObject({ x: 100, y: 200 })
		expect(editor.pageToScreen({ x: 100, y: 200 })).toMatchObject({ x: 100, y: 200 })
	})

	it('round-trip through a zoomed, panned camera', () => {
		const editor = makeEditor()
		editor.setCamera({ x: -320, y: -240, z: 2 })

		// camera x/y are the page offset: page point p lands at (p + c) * z on screen
		expect(editor.pageToScreen({ x: 370, y: 270 })).toMatchObject({ x: 100, y: 60 })
		expect(editor.screenToPage({ x: 100, y: 60 })).toMatchObject({ x: 370, y: 270 })

		for (const point of [
			{ x: 0, y: 0 },
			{ x: 123.5, y: -678.25 },
			{ x: -50, y: 9999 },
		]) {
			const roundTripped = editor.pageToScreen(editor.screenToPage(point))
			expect(roundTripped.x).toBeCloseTo(point.x, 9)
			expect(roundTripped.y).toBeCloseTo(point.y, 9)
		}
	})

	it('returns z = 0.5 (a pressure default), not the zoom level', () => {
		const editor = makeEditor()
		editor.setCamera({ x: 0, y: 0, z: 2 })
		// the z channel of these Vecs is pointer pressure, defaulting to 0.5 — it is
		// passed through untouched, never derived from the camera
		expect(editor.screenToPage({ x: 10, y: 10 }).z).toBe(0.5)
		expect(editor.pageToScreen({ x: 10, y: 10 }).z).toBe(0.5)
		expect(editor.screenToPage({ x: 10, y: 10, z: 0.9 }).z).toBe(0.9)
	})
})

describe('setCamera', () => {
	it('sets the camera and derives the viewport page bounds from it', () => {
		const editor = makeEditor()
		expect(editor.getViewportScreenBounds()).toEqual(new Box(0, 0, 1920, 1080))
		// page bounds are (-cx, -cy, ...), so a zero camera yields negative zero corners
		expect(editor.getViewportPageBounds()).toEqual(new Box(-0, -0, 1920, 1080))

		editor.setCamera({ x: -500, y: -250, z: 2 })
		expect(editor.getCamera()).toMatchObject({ x: -500, y: -250, z: 2 })
		// page bounds start at -camera and shrink by the zoom factor
		expect(editor.getViewportPageBounds()).toEqual(new Box(500, 250, 960, 540))
	})

	it('resets the zoom to 1 when no z is given', () => {
		const editor = makeEditor()
		editor.setCamera({ x: 0, y: 0, z: 4 })
		editor.setCamera({ x: -100, y: -100 })
		// surprising but real: setCamera casts the point through Vec, whose missing-z
		// default is 1 — so omitting z snaps the camera back to 100% instead of keeping
		// the current zoom
		expect(editor.getCamera()).toMatchObject({ x: -100, y: -100, z: 1 })
	})

	it('clamps z to the camera zoom steps (0.05 to 8 by default)', () => {
		const editor = makeEditor()
		editor.setCamera({ x: 0, y: 0, z: 100 })
		expect(editor.getCamera().z).toBe(8)
		editor.setCamera({ x: 0, y: 0, z: 0.001 })
		expect(editor.getCamera().z).toBe(0.05)
	})
})

describe('updateViewportScreenBounds', () => {
	it('re-anchors screen conversions but not the viewport page bounds', () => {
		const editor = makeEditor()
		editor.setCamera({ x: -320, y: -240, z: 2 })
		editor.updateViewportScreenBounds(new Box(100, 50, 800, 600))

		expect(editor.getViewportScreenBounds()).toEqual(new Box(100, 50, 800, 600))
		// screen conversions subtract the screen origin: the viewport's top-left screen
		// corner maps to the top-left of the page viewport
		expect(editor.screenToPage({ x: 100, y: 50 })).toMatchObject({ x: 320, y: 240 })
		expect(editor.pageToScreen({ x: 320, y: 240 })).toMatchObject({ x: 100, y: 50 })
		// the page bounds ignore the screen origin — they come from camera and size alone
		expect(editor.getViewportPageBounds()).toEqual(new Box(320, 240, 400, 300))
	})

	it('keeps the camera by default, and the page center with center: true', () => {
		const editor = makeEditor()
		editor.setCamera({ x: -500, y: -250, z: 2 })

		editor.updateViewportScreenBounds(new Box(0, 0, 960, 540))
		// same camera → the visible page area shrank toward its top-left
		expect(editor.getCamera()).toMatchObject({ x: -500, y: -250, z: 2 })
		expect(editor.getViewportPageBounds()).toEqual(new Box(500, 250, 480, 270))

		editor.updateViewportScreenBounds(new Box(0, 0, 1920, 1080), true)
		// center: true pans the camera so the page center (740, 385) is preserved
		expect(editor.getViewportPageBounds().center).toMatchObject({ x: 740, y: 385 })
		expect(editor.getCamera().z).toBe(2)
	})
})

describe('zoomToBounds', () => {
	it('fits the bounds in the viewport with the documented zoom and centering', () => {
		const editor = makeEditor()
		const bounds = new Box(200, 100, 400, 300)
		editor.zoomToBounds(bounds)

		// fit zoom uses the viewport minus a 128px inset (options.zoomToFitPadding),
		// limited by the tighter axis: (1080 - 128) / 300
		expect(editor.getCamera().z).toBeCloseTo(952 / 300, 9)
		const viewport = editor.getViewportPageBounds()
		expect(viewport.contains(bounds)).toBe(true)
		expect(viewport.center.x).toBeCloseTo(bounds.center.x, 9)
		expect(viewport.center.y).toBeCloseTo(bounds.center.y, 9)
	})

	it('honors targetZoom as a cap and inset: 0 as edge-to-edge', () => {
		const editor = makeEditor()
		const bounds = new Box(0, 0, 400, 300)

		editor.zoomToBounds(bounds, { targetZoom: 1 })
		expect(editor.getCamera().z).toBe(1)
		expect(editor.getViewportPageBounds().center).toMatchObject({ x: 200, y: 150 })

		editor.zoomToBounds(bounds, { inset: 0 })
		// no inset: min(1920/400, 1080/300) = 3.6
		expect(editor.getCamera().z).toBeCloseTo(3.6, 9)
	})

	it('clamps to the minimum zoom for bounds far larger than the viewport', () => {
		const editor = makeEditor()
		editor.zoomToBounds(new Box(0, 0, 1_000_000, 1_000_000))
		expect(editor.getCamera().z).toBe(0.05)
		// at min zoom the bounds cannot fit — the viewport is centered on them instead
		expect(editor.getViewportPageBounds().center).toMatchObject({ x: 500_000, y: 500_000 })
	})
})

describe('zoomToSelection', () => {
	it('zooms to fit the selection when at 100 percent, else zooms toward 100 percent', () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape<TLGeoShape>({
			id,
			type: 'geo',
			x: 5000,
			y: 5000,
			props: { w: 400, h: 300 },
		})
		editor.select(id)

		// at z=1, behaves like zoomToBounds: zooms *in* past 100% to fit the shape
		editor.zoomToSelection()
		expect(editor.getCamera().z).toBeCloseTo(952 / 300, 9)
		expect(editor.getViewportPageBounds().center.x).toBeCloseTo(5200, 9)
		expect(editor.getViewportPageBounds().center.y).toBeCloseTo(5150, 9)

		// no longer at 100% → the same call now targets z=1, still centered on the selection
		editor.zoomToSelection()
		expect(editor.getCamera().z).toBe(1)
		expect(editor.getViewportPageBounds().center).toMatchObject({ x: 5200, y: 5150 })
	})

	it('is a no-op with nothing selected', () => {
		const editor = makeEditor()
		editor.setCamera({ x: -100, y: -200, z: 2 })
		editor.zoomToSelection()
		expect(editor.getCamera()).toMatchObject({ x: -100, y: -200, z: 2 })
	})
})
