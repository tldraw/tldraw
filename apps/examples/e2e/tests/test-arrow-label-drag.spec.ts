import { expect } from '@playwright/test'
import { setup } from '../shared-e2e'
import test from './fixtures/fixtures'

test.beforeEach(setup)

test('can reposition arrow label by dragging', async ({ page }) => {
	// Create an arrow shape
	await test.step('Create arrow shape', async () => {
		// Click on arrow tool
		await page.locator('[data-testid="tools.arrow"]').click()

		// Draw arrow from point A to point B
		await page.mouse.move(100, 100)
		await page.mouse.down()
		await page.mouse.move(300, 200)
		await page.mouse.up()

		// Switch back to select tool
		await page.locator('[data-testid="tools.select"]').click()
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
		await expect(page.locator('.tl-arrow-label').locator('text=Test Label').first()).toBeVisible()
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
		await page.mouse.move(initialLabelPosition.x + 10, initialLabelPosition.y + 10)
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
			x: newLabelBox!.x + 10 + newLabelBox!.width / 2,
			y: newLabelBox!.y + 10 + newLabelBox!.height / 2,
		}

		// Verify the label has moved horizontally
		expect(Math.abs(newLabelPosition.x - initialLabelPosition.x)).toBeGreaterThan(30)

		// Verify the text is still visible after repositioning
		await expect(
			page.locator('.tl-arrow-label').first().locator('text=Test Label').first()
		).toBeVisible()
	})
})

test('can snap arrow label back to default position', async ({ page }) => {
	// Create an arrow shape with label
	await test.step('Create arrow with label', async () => {
		// Click on arrow tool and create arrow
		await page.locator('[data-testid="tools.arrow"]').click()
		await page.mouse.move(100, 100)
		await page.mouse.down()
		await page.mouse.move(300, 200)
		await page.mouse.up()

		// Switch to select tool and add label
		await page.locator('[data-testid="tools.select"]').click()
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
		expect(Math.abs(finalCenter.x - 200)).toBeLessThan(30)
		expect(Math.abs(finalCenter.y - 150)).toBeLessThan(30)
	})
})

test('arrow label persists position after page operations', async ({ page }) => {
	// Create arrow with label and move it
	await test.step('Create and position arrow label', async () => {
		// Create arrow
		await page.locator('[data-testid="tools.arrow"]').click()
		await page.mouse.move(100, 100)
		await page.mouse.down()
		await page.mouse.move(300, 200)
		await page.mouse.up()

		// Add label
		await page.locator('[data-testid="tools.select"]').click()
		await page.mouse.dblclick(200, 150)
		await page.keyboard.type('Persistent Label')
		await page.keyboard.press('Escape')

		// Move label to a specific position
		const labelElement = page.locator('.tl-arrow-label').first()
		const labelBox = await labelElement.boundingBox()
		const labelCenter = {
			x: labelBox!.x + labelBox!.width / 2,
			y: labelBox!.y + labelBox!.height / 2,
		}

		await page.mouse.move(labelCenter.x, labelCenter.y)
		await page.mouse.down()
		await page.mouse.move(labelCenter.x + 60, labelCenter.y)
		await page.mouse.up()
	})

	// Test that position persists through undo/redo
	await test.step('Test undo/redo preserves position', async () => {
		// Get position after moving
		const labelElement = page.locator('.tl-arrow-label').first()
		const movedBox = await labelElement.boundingBox()
		const movedPosition = {
			x: movedBox!.x + movedBox!.width / 2,
			y: movedBox!.y + movedBox!.height / 2,
		}

		// Undo the move
		await page.keyboard.press('Control+z')

		// Redo the move
		await page.keyboard.press('Control+y')

		// Verify position is restored
		const restoredBox = await labelElement.boundingBox()
		const restoredPosition = {
			x: restoredBox!.x + restoredBox!.width / 2,
			y: restoredBox!.y + restoredBox!.height / 2,
		}

		expect(Math.abs(restoredPosition.x - movedPosition.x)).toBeLessThan(5)
		expect(Math.abs(restoredPosition.y - movedPosition.y)).toBeLessThan(5)
	})
})
