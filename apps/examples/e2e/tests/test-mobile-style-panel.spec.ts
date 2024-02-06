import test, { expect } from '@playwright/test'
import { setup } from '../shared-e2e'

test.describe('mobile ui', () => {
	test.beforeEach(setup)
	test('style panel opens and closes as expected', async ({ isMobile, page }) => {
		test.skip(!isMobile, 'only run on mobile')
		const mobileStylesButton = page.getByTestId('mobile-styles.button')
		const stylePanel = page.getByTestId('style.panel')
		await expect(stylePanel).toBeHidden()
		await mobileStylesButton.click()
		await expect(stylePanel).toBeVisible()
		// clicking off the style panel should close it
		page.mouse.click(200, 200)
		await expect(stylePanel).toBeHidden()
	})
	test('style menu button is disabled for the eraser tool', async ({ isMobile, page }) => {
		test.skip(!isMobile, 'only run on mobile')
		const eraserTool = page.getByTestId('tools.eraser')
		await eraserTool.click()
		const mobileStylesButton = page.getByTestId('mobile-styles.button')
		await expect(mobileStylesButton).toBeDisabled()
	})
})
