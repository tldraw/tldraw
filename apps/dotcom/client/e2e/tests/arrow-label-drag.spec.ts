import { expect, test } from '../fixtures/tla-test'

test.beforeEach(async ({ editor }) => {
	await editor.isLoaded()
})

test('can reposition arrow label by dragging', async ({ page, editor }) => {
	// Close sidebar to have more space for testing
	await editor.ensureSidebarClosed()

	// Create an arrow shape
	await test.step('Create arrow shape', async () => {
		// Click on arrow tool
		await page.getByTestId('tools.arrow').click()

		// Draw arrow from point A to point B
		await page.mouse.move(100, 100)
		await page.mouse.down()
		await page.mouse.move(300, 200)
		await page.mouse.up()

		// Switch back to select tool
		await page.getByTestId('tools.select').click()
	})

	// Add text to the arrow to create a label
	await test.step('Add label to arrow', async () => {
		// Double-click on the arrow to start editing text
		await page.mouse.dblclick(200, 150)

		// Type some text for the label
		await page.keyboard.type('Test Label')

		// Press escape to finish editing
		await page.keyboard.press('Escape')

		// Ensure the label is visible
		await expect(page.locator('text=Test Label')).toBeVisible()
	})

	// Get initial label position
	let initialLabelPosition: { x: number; y: number }
	await test.step('Record initial label position', async () => {
		const labelElement = page.locator('.tl-arrow-label').first()
		await expect(labelElement).toBeVisible()

		const labelBox = await labelElement.boundingBox()
		expect(labelBox).not.toBeNull()

		initialLabelPosition = {
			x: labelBox!.x + labelBox!.width / 2,
			y: labelBox!.y + labelBox!.height / 2,
		}
	})

	// Drag the label to reposition it
	await test.step('Drag label to new position', async () => {
		// Click and hold on the label
		await page.mouse.move(initialLabelPosition.x, initialLabelPosition.y)
		await page.mouse.down()

		// Drag the label to a new position (offset by 50 pixels in x direction)
		const newX = initialLabelPosition.x + 50
		const newY = initialLabelPosition.y

		await page.mouse.move(newX, newY)
		await page.mouse.up()
	})

	// Verify the label position has changed
	await test.step('Verify label position changed', async () => {
		const labelElement = page.locator('.tl-arrow-label').first()
		await expect(labelElement).toBeVisible()

		const newLabelBox = await labelElement.boundingBox()
		expect(newLabelBox).not.toBeNull()

		const newLabelPosition = {
			x: newLabelBox!.x + newLabelBox!.width / 2,
			y: newLabelBox!.y + newLabelBox!.height / 2,
		}

		// Verify the label has moved horizontally
		expect(Math.abs(newLabelPosition.x - initialLabelPosition.x)).toBeGreaterThan(30)

		// Verify the text is still visible after repositioning
		await expect(page.locator('text=Test Label')).toBeVisible()
	})

	// Verify the change persists after page reload
	await test.step('Verify change persists after reload', async () => {
		await page.reload()
		await editor.isLoaded()

		// The label should still be visible and in the new position
		await expect(page.locator('text=Test Label')).toBeVisible()

		const labelElement = page.locator('.tl-arrow-label').first()
		await expect(labelElement).toBeVisible()

		const reloadedLabelBox = await labelElement.boundingBox()
		expect(reloadedLabelBox).not.toBeNull()

		const reloadedLabelPosition = {
			x: reloadedLabelBox!.x + reloadedLabelBox!.width / 2,
			y: reloadedLabelBox!.y + reloadedLabelBox!.height / 2,
		}

		// Verify the label is still in the moved position
		expect(Math.abs(reloadedLabelPosition.x - initialLabelPosition.x)).toBeGreaterThan(30)
	})
})

test('can snap arrow label back to default position', async ({ page, editor }) => {
	// Close sidebar to have more space for testing
	await editor.ensureSidebarClosed()

	// Create an arrow shape with label
	await test.step('Create arrow with label', async () => {
		// Click on arrow tool and create arrow
		await page.getByTestId('tools.arrow').click()
		await page.mouse.move(100, 100)
		await page.mouse.down()
		await page.mouse.move(300, 200)
		await page.mouse.up()

		// Switch to select tool and add label
		await page.getByTestId('tools.select').click()
		await page.mouse.dblclick(200, 150)
		await page.keyboard.type('Snap Test')
		await page.keyboard.press('Escape')
	})

	// Drag label away from center
	await test.step('Move label away from center', async () => {
		const labelElement = page.locator('.tl-arrow-label').first()
		const labelBox = await labelElement.boundingBox()
		expect(labelBox).not.toBeNull()

		const labelCenter = {
			x: labelBox!.x + labelBox!.width / 2,
			y: labelBox!.y + labelBox!.height / 2,
		}

		// Drag label significantly away from default position
		await page.mouse.move(labelCenter.x, labelCenter.y)
		await page.mouse.down()
		await page.mouse.move(labelCenter.x + 80, labelCenter.y)
		await page.mouse.up()
	})

	// Drag label back near the center to test snapping
	await test.step('Test snapping back to center', async () => {
		const labelElement = page.locator('.tl-arrow-label').first()
		const currentBox = await labelElement.boundingBox()
		expect(currentBox).not.toBeNull()

		const currentCenter = {
			x: currentBox!.x + currentBox!.width / 2,
			y: currentBox!.y + currentBox!.height / 2,
		}

		// Drag label close to the original center position
		// The arrow should snap the label back to its default position
		await page.mouse.move(currentCenter.x, currentCenter.y)
		await page.mouse.down()
		await page.mouse.move(200, 150) // Near the original arrow center
		await page.mouse.up()

		// The label should have snapped back to the default position
		const finalBox = await labelElement.boundingBox()
		expect(finalBox).not.toBeNull()

		// Verify the label is now closer to the arrow center
		const finalCenter = {
			x: finalBox!.x + finalBox!.width / 2,
			y: finalBox!.y + finalBox!.height / 2,
		}

		// The label should be reasonably close to the arrow's midpoint
		expect(Math.abs(finalCenter.x - 200)).toBeLessThan(20)
		expect(Math.abs(finalCenter.y - 150)).toBeLessThan(20)
	})
})
