import test, { Page, expect } from '@playwright/test'
import { type Editor } from 'tldraw'
import { hardResetEditor, setupPage, setupPageWithShapes, withMenu } from '../shared-e2e'

declare const __tldraw_ui_event: { name: string }
declare const editor: Editor

// We're just testing the events, not the actual results.

let page: Page

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

	test('can begin a right-click drag after closing the menu', async () => {
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
})
