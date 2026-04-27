import { Page, expect } from '@playwright/test'
import { Editor, IndexKey } from 'tldraw'
import test from '../fixtures/fixtures'
import { hardResetEditor, setup } from '../shared-e2e'

declare const editor: Editor

// Screenshot-based regression tests for canvas overlay appearance.
//
// Overlays render to a single <canvas class="tl-canvas-overlays"> element, so
// we screenshot the `.tl-canvas` region and let the image compare cover every
// overlay kind (selection foreground, shape handles, brush, snap indicators,
// scribble, etc.) at once.
//
// Tests use direct editor state injection (brush/zoomBrush via
// updateInstanceState, scribbles via ScribbleManager, snap indicators via
// SnapManager.setIndicators) rather than simulating drags. This is what the
// unit tests for each OverlayUtil already do, and it keeps the states frame-
// exact rather than timing-dependent.

async function prepare(page: Page) {
	await page.evaluate(() => {
		editor.user.updateUserPreferences({ colorScheme: 'light', animationSpeed: 0 })
		editor.setCamera({ x: 0, y: 0, z: 1 }, { immediate: true })
		editor.updateInstanceState({ isGridMode: false })
	})
	// Move mouse out of any shape to avoid hover indicators.
	await page.mouse.move(0, 0)
}

async function snapshotCanvas(page: Page) {
	// Wait for two rAFs so reactive overlay canvases have committed their paint.
	await page.evaluate(
		() =>
			new Promise<void>((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
			)
	)
	// Allow a small tolerance to absorb sub-pixel anti-aliasing variance on
	// rotated or curved overlay strokes. A real overlay regression (missing
	// handle, wrong color, moved stroke) changes far more than 0.5% of pixels.
	await expect(page.locator('.tl-canvas')).toHaveScreenshot({ maxDiffPixelRatio: 0.005 })
}

test.describe('Overlay snapshots', () => {
	test.skip(
		({ isMobile }) => isMobile,
		'Overlay snapshots are desktop-only; mobile overlays render differently (coarse-pointer rotate handle, different resize handle visibility).'
	)

	test.beforeEach(async ({ page, context }) => {
		const url = page.url()
		if (!url.includes('end-to-end')) {
			await setup({ page, context } as any)
		} else {
			await hardResetEditor(page)
		}
		await prepare(page)
	})

	test('selection foreground: single shape', async ({ page }) => {
		await page.evaluate(() => {
			editor.createShape({
				type: 'geo',
				x: 220,
				y: 160,
				props: { w: 240, h: 160, geo: 'rectangle', dash: 'solid', fill: 'none' },
			})
			editor.selectAll()
		})
		await snapshotCanvas(page)
	})

	test('selection foreground: multiple shapes', async ({ page }) => {
		await page.evaluate(() => {
			editor.createShapes([
				{
					type: 'geo',
					x: 180,
					y: 140,
					props: { w: 120, h: 100, geo: 'rectangle', dash: 'solid', fill: 'none' },
				},
				{
					type: 'geo',
					x: 360,
					y: 200,
					props: { w: 140, h: 120, geo: 'ellipse', dash: 'solid', fill: 'none' },
				},
			])
			editor.selectAll()
		})
		await snapshotCanvas(page)
	})

	test('selection foreground: rotated shape', async ({ page }) => {
		await page.evaluate(() => {
			editor.createShape({
				type: 'geo',
				x: 260,
				y: 180,
				rotation: Math.PI / 6,
				props: { w: 220, h: 140, geo: 'rectangle', dash: 'solid', fill: 'none' },
			})
			editor.selectAll()
		})
		await snapshotCanvas(page)
	})

	test('shape handles: arrow endpoints', async ({ page }) => {
		await page.evaluate(() => {
			editor.createShape({
				type: 'arrow',
				x: 220,
				y: 220,
				props: {
					start: { x: 0, y: 0 },
					end: { x: 280, y: 0 },
					dash: 'solid',
				},
			})
			editor.selectAll()
		})
		await snapshotCanvas(page)
	})

	test('shape handles: line with vertices', async ({ page }) => {
		await page.evaluate(() => {
			editor.createShape({
				type: 'line',
				x: 200,
				y: 260,
				props: {
					dash: 'solid',
					points: {
						a1: { id: 'a1', index: 'a1' as IndexKey, x: 0, y: 0 },
						a2: { id: 'a2', index: 'a2' as IndexKey, x: 180, y: -60 },
						a3: { id: 'a3', index: 'a3' as IndexKey, x: 360, y: 0 },
					},
				},
			})
			editor.selectAll()
		})
		await snapshotCanvas(page)
	})

	test('shape handles: line endpoints and hovered center handle', async ({ page }) => {
		// Capture the two states a user sees on a selected line: the idle state
		// where only the vertex handles at the start and end are visible, and
		// the hover state where the midpoint create handle becomes visible
		// with its hover halo.
		await page.evaluate(() => {
			editor.createShape({
				type: 'line',
				x: 200,
				y: 200,
				props: {
					dash: 'solid',
					points: {
						a1: { id: 'a1', index: 'a1' as IndexKey, x: 0, y: 0 },
						a2: { id: 'a2', index: 'a2' as IndexKey, x: 280, y: 280 },
					},
				},
			})
			editor.selectAll()
		})

		await snapshotCanvas(page)

		// Force-hover the midpoint 'create' handle so the screenshot is frame-
		// exact regardless of the browser's pointer coordinate rounding.
		await page.evaluate(() => {
			const shape = editor.getOnlySelectedShape()!
			const handles = editor.getShapeHandles(shape)!
			const midHandle = handles.find((h) => h.type === 'create')!
			editor.overlays.setHoveredOverlay(`handle:${shape.id}:${midHandle.id}`)
		})
		await snapshotCanvas(page)
	})

	test('brush overlay', async ({ page }) => {
		await page.evaluate(() => {
			editor.updateInstanceState({ brush: { x: 180, y: 140, w: 320, h: 200 } })
		})
		await snapshotCanvas(page)
	})

	test('zoom brush overlay', async ({ page }) => {
		await page.evaluate(() => {
			editor.updateInstanceState({ zoomBrush: { x: 180, y: 140, w: 320, h: 200 } })
		})
		await snapshotCanvas(page)
	})

	test('snap indicator overlay: point snaps', async ({ page }) => {
		await page.evaluate(() => {
			editor.createShapes([
				{
					type: 'geo',
					x: 180,
					y: 160,
					props: { w: 100, h: 100, geo: 'rectangle', dash: 'solid', fill: 'none' },
				},
				{
					type: 'geo',
					x: 380,
					y: 160,
					props: { w: 100, h: 100, geo: 'rectangle', dash: 'solid', fill: 'none' },
				},
			])
			editor.snaps.setIndicators([
				{
					id: 'p-top',
					type: 'points',
					points: [
						{ x: 230, y: 160 },
						{ x: 430, y: 160 },
					],
				},
				{
					id: 'p-bottom',
					type: 'points',
					points: [
						{ x: 230, y: 260 },
						{ x: 430, y: 260 },
					],
				},
			])
		})
		await snapshotCanvas(page)
	})

	test('scribble overlay', async ({ page }) => {
		await page.evaluate(async () => {
			const item = editor.scribbles.addScribble(
				{ color: 'accent', size: 20, opacity: 0.8, taper: true },
				'snapshot-scribble'
			)
			// Build a smooth arc of points. Advance the tick between each
			// addPoint so ScribbleManager moves `next` into `scribble.points`.
			const pts: Array<[number, number]> = []
			for (let i = 0; i <= 20; i++) {
				const t = i / 20
				const x = 200 + t * 320
				const y = 240 + Math.sin(t * Math.PI) * -60
				pts.push([x, y])
			}
			for (const [x, y] of pts) {
				editor.scribbles.addPoint(item.id, x, y, 0.5)
				editor.scribbles.tick(16)
			}
			editor.scribbles.complete(item.id)
			editor.scribbles.tick(16)
		})
		await snapshotCanvas(page)
	})
})
