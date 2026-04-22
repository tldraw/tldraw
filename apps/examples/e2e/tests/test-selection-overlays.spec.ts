import { expect } from '@playwright/test'
import { Editor, TLAssetId, TLShapeId } from 'tldraw'
import { EndToEndApi } from '../../src/misc/EndToEndApi'
import test from '../fixtures/fixtures'
import { setupOrReset } from '../shared-e2e'

declare const editor: Editor
declare const tldrawApi: EndToEndApi

// These tests protect the user-visible behaviours of the selection overlay:
// rotate controls, crop mode re-entry, text selection outline during resize,
// and hover affordance on selection controls. They are intentionally
// behavioural (state + DOM) rather than screenshot-based.

const isMobileProject = () => test.info().project.name.includes('Mobile')

test.describe('Selection overlay interactions', () => {
	test.beforeEach(setupOrReset)

	test('rotate corner handle starts rotation and rotates the shape', async ({ page }) => {
		// The corner rotate handles are desktop-only (coarse pointer hides
		// them in favour of the mobile rotate handle, which is covered
		// implicitly by the crop test below).
		test.skip(isMobileProject(), 'Corner rotate handles are hidden on coarse pointer')

		const shapeId = await page.evaluate(() => {
			const id = 'shape:rotate-target' as TLShapeId
			editor.createShapes([
				{
					id,
					type: 'geo',
					x: 200,
					y: 200,
					props: { w: 120, h: 120, geo: 'rectangle' },
				},
			])
			editor.select(id)
			return id
		})

		const handle = page.getByTestId('selection.rotate.top-left')
		await expect(handle).toBeVisible()
		const box = await handle.boundingBox()
		if (!box) throw new Error('rotate handle has no bounding box')

		const cx = box.x + box.width / 2
		const cy = box.y + box.height / 2

		await page.mouse.move(cx, cy)
		await page.mouse.down()
		// Drag tangentially to the selection centre so rotation accumulates.
		await page.mouse.move(cx - 40, cy + 40, { steps: 10 })

		expect(await page.evaluate(() => editor.getPath())).toBe('select.rotating')

		// Continue dragging to build up a clearly non-zero rotation.
		await page.mouse.move(cx - 80, cy + 80, { steps: 10 })
		await page.mouse.up()

		const { path, rotation } = await page.evaluate((id) => {
			return {
				path: editor.getPath(),
				rotation: editor.getShape(id as TLShapeId)!.rotation,
			}
		}, shapeId)

		expect(path).toBe('select.idle')
		expect(Math.abs(rotation)).toBeGreaterThan(0)
	})

	test('rotate handle in crop mode rotates and returns to crop idle', async ({
		page,
		isMobile,
	}) => {
		// Set up a real image shape + asset so canCrop is true and the crop
		// mode has content to draw against.
		const shapeId = await page.evaluate(() => {
			const imageAsBase64 =
				'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
			const assetId = 'asset:overlay-test' as TLAssetId
			editor.createAssets([
				{
					id: assetId,
					typeName: 'asset',
					type: 'image',
					props: {
						src: imageAsBase64,
						w: 200,
						h: 200,
						name: 'overlay-test',
						isAnimated: false,
						mimeType: 'image/png',
					},
					meta: {},
				},
			])
			const id = 'shape:crop-target' as TLShapeId
			editor.createShape({
				id,
				type: 'image',
				x: 250,
				y: 250,
				props: {
					w: 200,
					h: 200,
					assetId,
					crop: {
						topLeft: { x: 0, y: 0 },
						bottomRight: { x: 1, y: 1 },
					},
				},
			})
			editor.select(id)
			editor.setCurrentTool('select.crop.idle')
			return id
		})

		expect(await page.evaluate(() => editor.getPath())).toBe('select.crop.idle')

		// Pick the visible rotate control. On coarse-pointer devices the
		// corner handles are hidden and the mobile circle is used instead.
		const cornerHandle = page.getByTestId('selection.rotate.top-left')
		const mobileHandle = page.getByTestId('selection.rotate.mobile')
		const handle = isMobile ? mobileHandle : cornerHandle
		await expect(handle).toBeVisible()

		const box = await handle.boundingBox()
		if (!box) throw new Error('rotate handle has no bounding box')
		const cx = box.x + box.width / 2
		const cy = box.y + box.height / 2

		const initialRotation = await page.evaluate(
			(id) => editor.getShape(id as TLShapeId)!.rotation,
			shapeId
		)

		await page.mouse.move(cx, cy)
		await page.mouse.down()
		await page.mouse.move(cx + 40, cy - 40, { steps: 10 })

		expect(await page.evaluate(() => editor.getPath())).toBe('select.rotating')

		await page.mouse.move(cx + 80, cy - 80, { steps: 10 })
		await page.mouse.up()

		const { path, rotation, croppingShapeId } = await page.evaluate((id) => {
			return {
				path: editor.getPath(),
				rotation: editor.getShape(id as TLShapeId)!.rotation,
				croppingShapeId: editor.getCroppingShapeId(),
			}
		}, shapeId)

		// The critical guarantee: releasing the rotate handle in crop mode
		// returns the editor to crop idle (not plain select idle), and the
		// cropping shape is still the one we selected.
		expect(path).toBe('select.crop.idle')
		expect(croppingShapeId).toBe(shapeId)
		expect(rotation).not.toBe(initialRotation)
	})

	test('selection outline stays visible while resizing a text shape', async ({ page }) => {
		// This guards the branch in TldrawSelectionForeground that keeps the
		// outline box mounted during `select.resizing` specifically for text
		// shapes (so the user still sees the affordance while resizing).
		test.skip(isMobileProject(), 'Desktop corner resize target used here')

		const shapeId = await page.evaluate(() => {
			const id = 'shape:text-resize' as TLShapeId
			editor.createShapes([
				{
					id,
					type: 'text',
					x: 200,
					y: 200,
					props: {
						richText: tldrawApi.toRichText(
							'Selection affordance should remain visible while resizing.'
						),
						autoSize: false,
						w: 300,
					},
				},
			])
			editor.select(id)
			return id
		})

		const initialWidth = await page.evaluate(
			(id) => editor.getShapePageBounds(id as TLShapeId)!.width,
			shapeId
		)

		// `selection.target.*` are the interactive pointer targets;
		// `selection.resize.*` are just the decorative corner squares.
		const handle = page.getByTestId('selection.target.bottom-right')
		await expect(handle).toBeVisible()
		const box = await handle.boundingBox()
		if (!box) throw new Error('resize target has no bounding box')
		const cx = box.x + box.width / 2
		const cy = box.y + box.height / 2

		await page.mouse.move(cx, cy)
		await page.mouse.down()
		await page.mouse.move(cx + 60, cy + 60, { steps: 10 })

		expect(await page.evaluate(() => editor.getPath())).toBe('select.resizing')

		// The selection-foreground SVG is always mounted; the outline rect
		// inside it only renders when `shouldDisplayBox` is true — which,
		// for text shapes, must remain true during select.resizing.
		const outline = page.locator('.tl-selection__fg__outline')
		await expect(outline).toBeVisible()

		// Drag farther to make sure the outline survives continued drag.
		await page.mouse.move(cx + 120, cy + 120, { steps: 10 })
		await expect(outline).toBeVisible()

		await page.mouse.up()

		const { path, widthAfter } = await page.evaluate((id) => {
			return {
				path: editor.getPath(),
				widthAfter: editor.getShapePageBounds(id as TLShapeId)!.width,
			}
		}, shapeId)

		expect(path).toBe('select.idle')
		// Outline still visible after release — we're back in idle.
		await expect(outline).toBeVisible()
		// Sanity-check the drag actually performed a resize (text corner
		// resize is proportional via `scale`, so assert on page bounds,
		// not `props.w`).
		expect(widthAfter).toBeGreaterThan(initialWidth)
	})

	test('selection controls expose interactive hover cursors, accounting for rotation', async ({
		page,
	}) => {
		// Protects two linked behaviours:
		//   1. Rotate/resize handles expose a custom cursor so that hovering
		//      changes the affordance (no regression to plain default cursor).
		//   2. That cursor updates when the selection is rotated, matching
		//      the overlay cursor rotation requirement.
		test.skip(isMobileProject(), 'Desktop-only corner handle cursors')

		const shapeId = await page.evaluate(() => {
			const id = 'shape:cursor-target' as TLShapeId
			editor.createShapes([
				{
					id,
					type: 'geo',
					x: 200,
					y: 200,
					props: { w: 150, h: 150, geo: 'rectangle' },
				},
			])
			editor.select(id)
			return id
		})

		const rotateHandle = page.getByTestId('selection.rotate.top-left')
		const resizeHandle = page.getByTestId('selection.target.top-left')
		await expect(rotateHandle).toBeVisible()
		await expect(resizeHandle).toBeVisible()

		// Read the SVG `cursor` presentation attribute. This is the value the
		// browser applies on hover, and it's baked into the React tree at
		// render time from `getCursor(type, editor.getSelectionRotation())`.
		const readCursor = (testId: string) =>
			page.locator(`[data-testid="${testId}"]`).getAttribute('cursor')

		const rotateCursor = await readCursor('selection.rotate.top-left')
		const resizeCursor = await readCursor('selection.target.top-left')

		// Both should be custom SVG data-URL cursors, not null / empty.
		expect(rotateCursor).toBeTruthy()
		expect(resizeCursor).toBeTruthy()
		expect(rotateCursor).toContain('url(')
		expect(resizeCursor).toContain('url(')
		expect(rotateCursor).not.toBe(resizeCursor)

		// Rotate the selection; both cursor SVGs are re-rendered at a new
		// angle, so the attribute values must change.
		await page.evaluate((id) => {
			editor.rotateShapesBy([id as TLShapeId], Math.PI / 2)
		}, shapeId)

		const rotateCursorAfter = await readCursor('selection.rotate.top-left')
		const resizeCursorAfter = await readCursor('selection.target.top-left')

		expect(rotateCursorAfter).toContain('url(')
		expect(resizeCursorAfter).toContain('url(')
		expect(rotateCursorAfter).not.toBe(rotateCursor)
		expect(resizeCursorAfter).not.toBe(resizeCursor)
	})
})
