import test, { Page, expect } from '@playwright/test'
import { hardResetEditor, setupPage, setupPageWithShapes, withMenu } from '../shared-e2e'

declare const __tldraw_ui_event: { name: string }
// `editor` is a global exposed on the page, not imported at test-runner level.
// Importing from 'tldraw' (even as `type`) breaks Node's --no-strip-types because
// the tldraw package re-exports PointerEvent from react, which doesn't exist in Node.
declare const editor: {
	inputs: any
	getCamera(): { x: number; y: number; z: number }
	getCurrentToolId(): string
	getPath(): string
	getSelectedShapeIds(): string[]
}

// We're just testing the events, not the actual results.

let page: Page

// Mobile emulation in Playwright dispatches touch events for `mouse.click/down/up`,
// so it can't simulate a real right-mouse-button sequence. Tests that depend on
// right-click pointer events only run on desktop (Chromium).
const isMobileProject = () => test.info().project.name.includes('Mobile')

test.describe('Context menu', async () => {
	test.beforeEach(async ({ browser }) => {
		if (!page) {
			page = await browser.newPage()
			await setupPage(page)
		} else {
			await hardResetEditor(page)
		}
		await setupPageWithShapes(page)
	})

	test('distribute horizontal', async () => {
		// distribute horizontal
		await page.keyboard.press('Control+a')
		await page.mouse.click(200, 200, { button: 'right' })
		await withMenu(page, 'context-menu.arrange.distribute-horizontal', (item) => item.focus())
		await page.keyboard.press('Enter')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'distribute-shapes',
			data: { operation: 'horizontal', source: 'context-menu' },
		})
	})

	test('distribute vertical', async () => {
		// distribute vertical — Shift+Alt+V
		await page.keyboard.press('Control+a')
		await page.mouse.click(200, 200, { button: 'right' })
		await withMenu(page, 'context-menu.arrange.distribute-vertical', (item) => item.focus())
		await page.keyboard.press('Enter')
		expect(await page.evaluate(() => __tldraw_ui_event)).toMatchObject({
			name: 'distribute-shapes',
			data: { operation: 'vertical', source: 'context-menu' },
		})
	})

	test('reopens after moving and right-clicking again', async () => {
		test.skip(isMobileProject(), 'Mobile emulation does not simulate right-click')
		await page.mouse.click(200, 200, { button: 'right' })
		await expect(page.getByTestId('context-menu')).toBeVisible()

		await page.mouse.move(600, 400)
		await page.mouse.down({ button: 'right' })
		await page.mouse.up({ button: 'right' })

		await expect(page.getByTestId('context-menu')).toBeVisible()
		expect(
			await page.evaluate(() => ({
				isRightPointing: editor.inputs.getIsRightPointing(),
				isPanning: editor.inputs.getIsPanning(),
			}))
		).toMatchObject({
			isRightPointing: false,
			isPanning: false,
		})
	})

	test('static right-click on plain canvas opens context menu', async () => {
		test.skip(isMobileProject(), 'Mobile emulation does not simulate right-click')
		// Right-click on empty canvas (no menu already open)
		await page.mouse.click(600, 400, { button: 'right' })
		await expect(page.getByTestId('context-menu')).toBeVisible()

		// Wait for any async events (native contextmenu follows pointerup)
		await page.waitForTimeout(100)

		// Menu should still be visible — a leaked native contextmenu must not toggle it closed
		await expect(page.getByTestId('context-menu')).toBeVisible()
		expect(
			await page.evaluate(() => ({
				isRightPointing: editor.inputs.getIsRightPointing(),
				isPanning: editor.inputs.getIsPanning(),
			}))
		).toMatchObject({
			isRightPointing: false,
			isPanning: false,
		})
	})

	test('right-click drag on plain canvas pans without opening context menu', async () => {
		const initialCamera = await page.evaluate(() => {
			const camera = editor.getCamera()
			return { x: camera.x, y: camera.y, z: camera.z }
		})

		await page.mouse.move(300, 300)
		await page.mouse.down({ button: 'right' })
		await page.mouse.move(500, 500, { steps: 5 })

		expect(
			await page.evaluate(() => ({
				isPanning: editor.inputs.getIsPanning(),
				isRightPointing: editor.inputs.getIsRightPointing(),
			}))
		).toMatchObject({
			isPanning: true,
			isRightPointing: true,
		})

		await page.mouse.up({ button: 'right' })

		// Context menu should NOT open after a drag
		await expect(page.getByTestId('context-menu')).toBeHidden()

		// Camera should have moved
		expect(
			await page.evaluate((initialCamera) => {
				const camera = editor.getCamera()
				return camera.x !== initialCamera.x || camera.y !== initialCamera.y
			}, initialCamera)
		).toBe(true)

		// Input state should be clean
		expect(
			await page.evaluate(() => ({
				isPanning: editor.inputs.getIsPanning(),
				isRightPointing: editor.inputs.getIsRightPointing(),
			}))
		).toMatchObject({
			isPanning: false,
			isRightPointing: false,
		})
	})

	test('can begin a right-click drag after closing the menu', async () => {
		test.skip(isMobileProject(), 'Mobile emulation does not simulate right-click')
		await page.mouse.click(200, 200, { button: 'right' })
		await expect(page.getByTestId('context-menu')).toBeVisible()

		await page.mouse.move(600, 400)
		const initialCamera = await page.evaluate(() => {
			const camera = editor.getCamera()
			return { x: camera.x, y: camera.y, z: camera.z }
		})

		await page.mouse.down({ button: 'right' })
		await expect(page.getByTestId('context-menu')).toBeHidden()

		await page.mouse.move(700, 500, { steps: 5 })

		expect(
			await page.evaluate(() => ({
				camera: editor.getCamera(),
				isPanning: editor.inputs.getIsPanning(),
				isRightPointing: editor.inputs.getIsRightPointing(),
			}))
		).toMatchObject({
			isPanning: true,
			isRightPointing: true,
		})

		await page.mouse.up({ button: 'right' })

		expect(
			await page.evaluate((initialCamera) => {
				const camera = editor.getCamera()
				return {
					cameraChanged:
						camera.x !== initialCamera.x ||
						camera.y !== initialCamera.y ||
						camera.z !== initialCamera.z,
					isPanning: editor.inputs.getIsPanning(),
					isRightPointing: editor.inputs.getIsRightPointing(),
				}
			}, initialCamera)
		).toMatchObject({
			cameraChanged: true,
			isPanning: false,
			isRightPointing: false,
		})
	})

	test('left-click closes menu and leaves editor idle', async () => {
		test.skip(isMobileProject(), 'Mobile emulation does not simulate right-click')
		// Move to a clearly empty spot so the right-click doesn't select or hover a shape
		await page.mouse.move(800, 600)
		await page.mouse.click(800, 600, { button: 'right' })
		await expect(page.getByTestId('context-menu')).toBeVisible()

		// Left-click elsewhere on empty canvas — should close the menu
		await page.mouse.click(900, 700)
		await expect(page.getByTestId('context-menu')).toBeHidden()

		// Tool state clean, pointer released — regardless of selection state
		expect(
			await page.evaluate(() => ({
				path: editor.getPath(),
				isPointing: editor.inputs.getIsPointing(),
				isRightPointing: editor.inputs.getIsRightPointing(),
			}))
		).toMatchObject({
			path: 'select.idle',
			isPointing: false,
			isRightPointing: false,
		})
	})

	test('left-click drag with menu open starts brush selection', async () => {
		test.skip(isMobileProject(), 'Mobile emulation does not simulate right-click')
		await page.mouse.move(800, 600)
		await page.mouse.click(800, 600, { button: 'right' })
		await expect(page.getByTestId('context-menu')).toBeVisible()

		// Left-click + drag entirely on empty canvas
		await page.mouse.move(900, 100)
		await page.mouse.down({ button: 'left' })
		await page.mouse.move(1100, 300, { steps: 10 })

		// Menu closes, editor enters brushing state
		await expect(page.getByTestId('context-menu')).toBeHidden()
		expect(await page.evaluate(() => editor.getPath())).toBe('select.brushing')

		await page.mouse.up({ button: 'left' })

		// After release: brush ended, editor idle, pointer released
		expect(
			await page.evaluate(() => ({
				path: editor.getPath(),
				isPointing: editor.inputs.getIsPointing(),
			}))
		).toMatchObject({
			path: 'select.idle',
			isPointing: false,
		})
	})

	test('consecutive right-clicks keep menu continuously visible', async () => {
		test.skip(isMobileProject(), 'Mobile emulation does not simulate right-click')
		await page.mouse.click(200, 200, { button: 'right' })
		await expect(page.getByTestId('context-menu')).toBeVisible()

		// Right-click at a new location — observe visibility frequently during the transition
		// to catch any hidden flash between the old menu closing and the new one opening.
		await page.mouse.move(600, 400)
		const menu = page.getByTestId('context-menu')
		await page.mouse.down({ button: 'right' })
		await page.mouse.up({ button: 'right' })

		// Poll visibility for ~300ms; it must never be hidden during the transition.
		const samples = await page.evaluate(async () => {
			const results: boolean[] = []
			const el = () => document.querySelector('[data-testid="context-menu"]')
			for (let i = 0; i < 30; i++) {
				results.push(!!el())
				await new Promise((r) => setTimeout(r, 10))
			}
			return results
		})
		expect(samples.every((v) => v === true)).toBe(true)
		await expect(menu).toBeVisible()
	})

	test('left-click drag works after a right-click drag with menu open', async () => {
		test.skip(isMobileProject(), 'Mobile emulation does not simulate right-click')
		// Open a menu
		await page.mouse.click(200, 200, { button: 'right' })
		await expect(page.getByTestId('context-menu')).toBeVisible()

		// Right-click + drag to pan; this should release all pointer capture cleanly
		await page.mouse.move(600, 400)
		await page.mouse.down({ button: 'right' })
		await page.mouse.move(700, 500, { steps: 5 })
		await page.mouse.up({ button: 'right' })
		await expect(page.getByTestId('context-menu')).toBeHidden()

		// Now a regular left-click drag must still work — if pointer capture
		// leaked to the capture div or canvas, this brush would not engage.
		await page.mouse.move(100, 100)
		await page.mouse.down({ button: 'left' })
		await page.mouse.move(400, 400, { steps: 10 })
		expect(await page.evaluate(() => editor.getPath())).toBe('select.brushing')
		await page.mouse.up({ button: 'left' })
		expect(await page.evaluate(() => editor.getPath())).toBe('select.idle')
	})
})
