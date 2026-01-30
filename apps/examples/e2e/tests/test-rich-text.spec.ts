import { expect } from '@playwright/test'
import test from '../fixtures/fixtures'
import { setupOrReset } from '../shared-e2e'

test.describe('more rich text', () => {
	test.beforeEach(setupOrReset)

	test('Double click from select tool to create and edit text on the canvas', async ({
		page,
		toolbar,
	}) => {
		await toolbar.tools.select.click()
		await page.mouse.dblclick(150, 150)
		// Wait for the text editor to be ready
		await expect(page.getByTestId('rich-text-area')).toBeVisible()
		await page.keyboard.type('id like to go to india')
		expect(page.getByTestId('rich-text-area')).toHaveText('id like to go to india')
	})

	test('Click with text tool to create and edit text on the canvas', async ({ page, toolbar }) => {
		await toolbar.tools.text.click()
		await page.mouse.click(150, 150)
		// Wait for the text editor to be ready
		await expect(page.getByTestId('rich-text-area')).toBeVisible()
		await page.keyboard.type('Live in a big white house in the forest')
		expect(page.getByTestId('rich-text-area')).toHaveText('Live in a big white house in the forest')

		// expect canvas indicator to be visible (since the shape is editing)
		const canvasIndicator = page.locator('.tl-canvas-indicators')
		await expect(canvasIndicator).toBeVisible()
	})

	test('Click and drag with text tool to create and edit fixed-width text on the canvas', async ({
		page,
		toolbar,
	}) => {
		await toolbar.tools.text.click()
		await page.mouse.move(150, 150)
		await page.mouse.down()
		await page.mouse.move(350, 150, { steps: 10 })
		await page.mouse.up()
		// Wait for the text editor to be ready
		await expect(page.getByTestId('rich-text-area')).toBeVisible()
		await page.keyboard.type('Drink gin and tonic and play a grand piano')
		expect(page.getByTestId('rich-text-area')).toHaveText(
			'Drink gin and tonic and play a grand piano'
		)

		// expect canvas indicator to be visible (since the shape is editing)
		const canvasIndicator = page.locator('.tl-canvas-indicators')
		await expect(canvasIndicator).toBeVisible()
	})
})
