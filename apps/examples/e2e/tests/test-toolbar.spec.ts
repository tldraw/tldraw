import { expect } from '@playwright/test'
import test from '../fixtures/fixtures'
import { getAllShapeTypes, setupOrReset } from '../shared-e2e'

test.describe('when selecting a tool from the toolbar', () => {
	test.beforeEach(setupOrReset)

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
	test.beforeEach(setupOrReset)

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

	test('long press on the toolbar re-bases the drag origin', async ({
		page,
		toolbar,
		isMobile,
	}) => {
		if (isMobile) return

		const { rectangle } = toolbar.tools

		await rectangle.hover()
		const box = await rectangle.boundingBox()
		if (!box) throw new Error('no bounding box for rectangle tool')
		const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 }

		await test.step('slow drift during a long press does not create a shape', async () => {
			// Press and hold, then drift by small steps that each stay under the drag
			// threshold, pausing longer than the long-press duration between them so the
			// drag origin re-bases. The total drift is well past the threshold, but because
			// it's slow it must not accumulate into a drag-to-create.
			await page.mouse.move(center.x, center.y)
			await page.mouse.down()
			for (const step of [3, 6, 9, 12]) {
				await page.waitForTimeout(700)
				await page.mouse.move(center.x + step, center.y)
			}
			await page.mouse.up()

			expect(await getAllShapeTypes(page)).toHaveLength(0)
		})

		await test.step('a deliberate drag after pausing still creates a shape', async () => {
			// Second thoughts: press, hold past the long-press duration, then commit to a
			// real drag. The deliberate motion must still create a shape.
			await page.mouse.move(center.x, center.y)
			await page.mouse.down()
			await page.waitForTimeout(700)
			await page.mouse.move(center.x, center.y - 100)
			await page.mouse.move(center.x + 100, center.y - 200)
			await page.mouse.up()

			await expect.poll(async () => await getAllShapeTypes(page)).toEqual(['geo'])
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
