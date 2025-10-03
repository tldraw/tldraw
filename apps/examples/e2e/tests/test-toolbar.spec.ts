import { expect } from '@playwright/test'
import test from '../fixtures/fixtures'
import { getAllShapeTypes, setup, sleep } from '../shared-e2e'

test.describe('when selecting a tool from the toolbar', () => {
	test.beforeEach(setup)

	test('tool selection behaviors', async ({ toolbar }) => {
		const { select, draw, arrow, cloud } = toolbar.tools
		const { popoverCloud } = toolbar.popOverTools

		await test.step('selecting a tool changes the button color', async () => {
			await select.click()
			await toolbar.isSelected(select)
			await toolbar.isNotSelected(draw)
			await draw.click()
			await toolbar.isNotSelected(select)
			await toolbar.isSelected(draw)
		})

		await test.step('selecting certain tools exposes the tool-lock button', async () => {
			await draw.click()
			expect(toolbar.toolLock).toBeHidden()
			await arrow.click()
			expect(toolbar.toolLock).toBeVisible()
		})

		await test.step('selecting a tool from the popover makes it appear on toolbar', async () => {
			await expect(cloud).toBeHidden()
			await expect(toolbar.moreToolsPopover).toBeHidden()
			await toolbar.moreToolsButton.click()
			await expect(toolbar.moreToolsPopover).toBeVisible()
			await popoverCloud.click()
			await expect(toolbar.moreToolsPopover).toBeHidden()
			await expect(cloud).toBeVisible()
		})
	})
})

test.describe('when dragging a tool from the toolbar', () => {
	test.beforeEach(setup)

	test('dragging from main toolbar creates and positions shapes', async ({
		page,
		toolbar,
		isMobile,
	}) => {
		if (isMobile) return

		const { rectangle, arrow, text } = toolbar.tools

		await test.step('dragging rectangle tool creates a rectangle', async () => {
			const startPoint = { x: 100, y: 100 }
			const endPoint = { x: 200, y: 200 }

			// Start dragging from the rectangle tool
			await rectangle.hover()
			await page.mouse.down()
			await page.mouse.move(startPoint.x, startPoint.y)
			await page.mouse.move(endPoint.x, endPoint.y)
			await page.mouse.up()

			// Verify a rectangle was created
			const shapes = await getAllShapeTypes(page)
			expect(shapes).toHaveLength(1)
			expect(shapes).toContain('geo')
		})

		await sleep(100)

		await test.step('dragging arrow tool creates an arrow', async () => {
			const startPoint = { x: 300, y: 100 }
			const endPoint = { x: 400, y: 200 }

			// Start dragging from the arrow tool
			await arrow.hover()
			await page.mouse.down()
			await page.mouse.move(startPoint.x, startPoint.y)
			await page.mouse.move(endPoint.x, endPoint.y)
			await page.mouse.up()

			// Verify an arrow was created
			const shapes = await getAllShapeTypes(page)
			expect(shapes).toHaveLength(2)
			expect(shapes).toContain('geo')
			expect(shapes).toContain('arrow')
		})

		await sleep(100)

		await test.step('dragging text tool creates editable text', async () => {
			const startPoint = { x: 500, y: 100 }
			const endPoint = { x: 600, y: 200 }

			// Start dragging from the text tool
			await text.hover()
			await page.mouse.down()
			await page.mouse.move(startPoint.x, startPoint.y)
			await page.mouse.move(endPoint.x, endPoint.y)
			await page.mouse.up()

			// Verify a text shape was created
			const shapes = await getAllShapeTypes(page)
			expect(shapes).toHaveLength(3)
			expect(shapes).toContain('geo')
			expect(shapes).toContain('arrow')
			expect(shapes).toContain('text')

			// Verify text is in edit mode
			const hasTextInputFocused = await page.evaluate(() => {
				return document.activeElement?.classList.contains('tiptap')
			})
			expect(hasTextInputFocused).toBe(true)
		})
	})

	test('dragging from overflow toolbar creates shapes', async ({ page, toolbar }) => {
		// Open the overflow menu
		await toolbar.moreToolsButton.click()
		await expect(toolbar.moreToolsPopover).toBeVisible()

		const { popoverCloud } = toolbar.popOverTools

		await test.step('dragging cloud tool from overflow creates a cloud', async () => {
			const startPoint = { x: 100, y: 100 }
			const endPoint = { x: 200, y: 200 }

			// Start dragging from the cloud tool in overflow
			await popoverCloud.hover()
			await page.mouse.down()
			await page.mouse.move(startPoint.x, startPoint.y)
			await page.mouse.move(endPoint.x, endPoint.y)
			await page.mouse.up()

			// Verify a cloud shape was created
			const shapes = await getAllShapeTypes(page)
			expect(shapes).toHaveLength(1)
			expect(shapes).toContain('geo')
		})
	})
})
