import { expect, Page } from '@playwright/test'
import { Editor, TLAssetId, TLShapeId } from 'tldraw'
import test from '../fixtures/fixtures'
import { setupOrReset, sleepFrames } from '../shared-e2e'

declare const editor: Editor

// Visual regression tests for canvas overlays. Each test enters a specific
// deterministic state, waits for the overlay to settle, then compares a
// clipped canvas screenshot to a baseline.
//
// Strategy:
//   - Place shapes at fixed page coordinates inside a "safe" region that
//     is not covered by the default UI chrome (toolbar, style panel, etc.).
//   - Clip the screenshot to that same region so the baseline captures the
//     overlay geometry but little else.
//   - Rely on overlay SVG geometry being deterministic across runs of the
//     same platform. (Cross-OS baselines are managed by Playwright's
//     per-platform snapshot naming, same as the existing snapshot tests.)
//
// The safe clip region. The default Tldraw UI places a toolbar at the top
// and bottom and panels at the sides; a centred rectangle around
// (100..700, 100..500) sits cleanly inside the canvas background with
// no interactive UI overlapping.
const CLIP = { x: 80, y: 80, width: 640, height: 440 }

const isMobileProject = () => test.info().project.name.includes('Mobile')

async function resetCanvas(page: Page) {
	await page.evaluate(() => {
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
		editor.setCurrentTool('select')
		editor.setCamera({ x: 0, y: 0, z: 1 }, { immediate: true })
		editor.updateInstanceState({ isChangingStyle: false })
	})
	// Park the mouse far outside the clip rect so it doesn't introduce a
	// hover cursor into the screenshot.
	await page.mouse.move(1200, 700)
	await sleepFrames(2)
}

async function takeOverlayShot(page: Page, name: string) {
	// Let any pending reactive updates flush before snapshotting.
	await sleepFrames(2)
	await expect(page).toHaveScreenshot(name, { clip: CLIP })
}

test.describe('Overlay screenshots', () => {
	test.beforeEach(setupOrReset)
	test.beforeEach(async ({ page }) => {
		await resetCanvas(page)
	})

	test('selection foreground — resize and rotate handles on a geo shape', async ({ page }) => {
		test.skip(isMobileProject(), 'Corner rotate handles are hidden on coarse pointer')
		await page.evaluate(() => {
			const id = 'shape:sel-fg' as TLShapeId
			editor.createShapes([
				{
					id,
					type: 'geo',
					x: 260,
					y: 220,
					props: { w: 200, h: 150, geo: 'rectangle' },
				},
			])
			editor.select(id)
		})

		await takeOverlayShot(page, 'selection-foreground-handles.png')
	})

	test('selection foreground — rotated selection keeps handles rotated', async ({ page }) => {
		test.skip(isMobileProject(), 'Corner rotate handles are hidden on coarse pointer')
		await page.evaluate(() => {
			const id = 'shape:sel-fg-rot' as TLShapeId
			editor.createShapes([
				{
					id,
					type: 'geo',
					x: 300,
					y: 240,
					rotation: Math.PI / 6,
					props: { w: 200, h: 150, geo: 'rectangle' },
				},
			])
			editor.select(id)
		})

		await takeOverlayShot(page, 'selection-foreground-rotated.png')
	})

	test('mobile rotate handle is rendered on coarse-pointer devices', async ({ page }) => {
		test.skip(!isMobileProject(), 'Mobile rotate handle only appears on coarse pointer')
		await page.evaluate(() => {
			const id = 'shape:mobile-rot' as TLShapeId
			editor.createShapes([
				{
					id,
					type: 'geo',
					x: 150,
					y: 200,
					props: { w: 160, h: 120, geo: 'rectangle' },
				},
			])
			editor.select(id)
		})
		await takeOverlayShot(page, 'selection-foreground-mobile-rotate.png')
	})

	test('crop handles on an image shape', async ({ page }) => {
		await page.evaluate(() => {
			const imageAsBase64 =
				'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
			const assetId = 'asset:overlay-shot' as TLAssetId
			editor.createAssets([
				{
					id: assetId,
					typeName: 'asset',
					type: 'image',
					props: {
						src: imageAsBase64,
						w: 200,
						h: 160,
						name: 'overlay-shot',
						isAnimated: false,
						mimeType: 'image/png',
					},
					meta: {},
				},
			])
			const id = 'shape:crop' as TLShapeId
			editor.createShape({
				id,
				type: 'image',
				x: 260,
				y: 220,
				props: {
					w: 200,
					h: 160,
					assetId,
					crop: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 1, y: 1 } },
				},
			})
			editor.select(id)
			editor.setCurrentTool('select.crop.idle')
		})

		await takeOverlayShot(page, 'crop-handles.png')
	})

	test('shape handles — arrow endpoints and midpoint virtual handle', async ({ page }) => {
		test.skip(isMobileProject(), 'Virtual handles render differently on coarse pointer')
		await page.evaluate(() => {
			const id = 'shape:arrow-handles' as TLShapeId
			editor.createShapes([
				{
					id,
					type: 'arrow',
					x: 200,
					y: 300,
					props: {
						start: { x: 0, y: 0 },
						end: { x: 300, y: 0 },
					},
				},
			])
			editor.select(id)
		})

		await takeOverlayShot(page, 'shape-handles-arrow.png')
	})

	test('brush overlay while drag-selecting on empty canvas', async ({ page }) => {
		// Drag a marquee selection on an empty canvas. We snapshot mid-drag
		// (before releasing) so the brush rect is on screen.
		const start = { x: CLIP.x + 40, y: CLIP.y + 40 }
		const end = { x: CLIP.x + 360, y: CLIP.y + 260 }

		await page.mouse.move(start.x, start.y)
		await page.mouse.down()
		await page.mouse.move(end.x, end.y, { steps: 8 })

		expect(await page.evaluate(() => editor.getPath())).toBe('select.brushing')
		await takeOverlayShot(page, 'brush-overlay.png')
		await page.mouse.up()
	})

	test('zoom brush overlay while zoom-drag on empty canvas', async ({ page }) => {
		// Activate the zoom tool, then drag to open a zoom brush.
		await page.evaluate(() => editor.setCurrentTool('zoom'))

		const start = { x: CLIP.x + 60, y: CLIP.y + 60 }
		const end = { x: CLIP.x + 320, y: CLIP.y + 240 }

		await page.mouse.move(start.x, start.y)
		await page.mouse.down()
		await page.mouse.move(end.x, end.y, { steps: 8 })

		expect(await page.evaluate(() => editor.getPath())).toContain('zoom.zoom_brushing')
		await takeOverlayShot(page, 'zoom-brush-overlay.png')
		await page.mouse.up()
		// Leaving the zoom tool would zoom to the brushed rect; reset so the
		// next test starts at z=1.
		await page.evaluate(() => {
			editor.setCurrentTool('select')
			editor.setCamera({ x: 0, y: 0, z: 1 }, { immediate: true })
		})
	})

	test('snap indicator while translating a shape into alignment', async ({ page }) => {
		test.skip(isMobileProject(), 'Snap indicator geometry is desktop-only in this fixture')

		// Force "always snap" so we don't depend on platform-specific modifier
		// keys (meta on mac, ctrl elsewhere) to enable snapping.
		await page.evaluate(() => {
			editor.user.updateUserPreferences({ isSnapMode: true })
			editor.createShapes([
				{
					id: 'shape:snap-a' as TLShapeId,
					type: 'geo',
					x: 200,
					y: 220,
					props: { w: 120, h: 120, geo: 'rectangle' },
				},
				{
					id: 'shape:snap-b' as TLShapeId,
					type: 'geo',
					x: 500,
					y: 260,
					props: { w: 120, h: 120, geo: 'rectangle' },
				},
			])
			// Pre-select shape B so pointer down immediately begins translate.
			editor.select('shape:snap-b' as TLShapeId)
		})

		// Press down on shape B, then drag so its top edge lines up with
		// shape A's top edge (y = 220). Move slowly — snapping only
		// engages when the pointer velocity is low.
		const shapeBCenter = { x: 560, y: 320 }
		await page.mouse.move(shapeBCenter.x, shapeBCenter.y)
		await page.mouse.down()
		// Large number of steps keeps velocity below the snap threshold.
		await page.mouse.move(shapeBCenter.x, 280, { steps: 40 })
		// Park the pointer still for a bit so velocity falls to 0.
		await sleepFrames(10)

		await expect(page.locator('.tl-snap-indicator').first()).toBeVisible()
		await takeOverlayShot(page, 'snap-indicator.png')

		await page.mouse.up()
		await page.evaluate(() => {
			editor.user.updateUserPreferences({ isSnapMode: false })
		})
	})

	test('arrow hint overlay while aiming an elbow arrow at a shape', async ({ page }) => {
		test.skip(isMobileProject(), 'Arrow hint targets rely on fine-pointer hover geometry')

		// Arrow hint circles (`tl-arrow-hint-handle`) only render for elbow
		// arrows. Force the arrow tool to produce elbow arrows by writing
		// directly to `stylesForNextShape` (bypasses having to marshal the
		// StyleProp object through `page.evaluate`).
		await page.evaluate(() => {
			editor.createShapes([
				{
					id: 'shape:arrow-target' as TLShapeId,
					type: 'geo',
					x: 400,
					y: 260,
					props: { w: 200, h: 160, geo: 'rectangle' },
				},
			])
			editor.updateInstanceState({
				stylesForNextShape: {
					...editor.getInstanceState().stylesForNextShape,
					'tldraw:arrowKind': 'elbow',
				},
			})
			editor.setCurrentTool('arrow')
		})

		// Start the arrow to the left of the rectangle and drag the end
		// point inside the rectangle — the arrow-targeting machinery should
		// recognise the rect as a target and render hint circles.
		const start = { x: 200, y: 340 }
		const end = { x: 500, y: 340 }
		await page.mouse.move(start.x, start.y)
		await page.mouse.down()
		await page.mouse.move(end.x, end.y, { steps: 10 })
		await sleepFrames(2)

		// `.toBeVisible()` can flake for SVG children of a 0×0 overlay svg;
		// assert on the DOM count instead.
		await expect
			.poll(async () => await page.locator('.tl-arrow-hint-handle').count())
			.toBeGreaterThan(0)

		await takeOverlayShot(page, 'arrow-hint-overlay.png')

		await page.mouse.up()
		await page.evaluate(() => {
			const prev = editor.getInstanceState().stylesForNextShape
			const next = { ...prev }
			delete (next as any)['tldraw:arrowKind']
			editor.updateInstanceState({ stylesForNextShape: next })
			editor.setCurrentTool('select')
		})
	})
})
