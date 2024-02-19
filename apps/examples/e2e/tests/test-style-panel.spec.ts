import { expect } from '@playwright/test'
import { setup } from '../shared-e2e'
import test from './fixtures/fixtures'

test.describe('Style selection behaviour', () => {
	test.beforeEach(setup)
	test.only('selecting a style highlights the button', async ({
		isMobile,
		stylePanel,
		toolbar,
	}) => {
		const { blue } = stylePanel.colors
		expect(blue.first()).toHaveCSS('opacity', '0')
		if (isMobile) {
			await toolbar.mobileStylesButton.click()
		}
		await blue.click()
		expect(blue.first()).toHaveCSS('opacity', '1')
	})
})

test.describe('mobile style panel', () => {
	test.beforeEach(setup)
	test('opens and closes as expected', async ({ isMobile, page, toolbar, stylePanel }) => {
		test.skip(!isMobile, 'only run on mobile')

		await expect(stylePanel.getElement()).toBeHidden()
		await toolbar.mobileStylesButton.click()
		await expect(stylePanel.getElement()).toBeVisible()
		// clicking off the style panel should close it
		page.mouse.click(200, 200)
		await expect(stylePanel.getElement()).toBeHidden()
	})
	test('style menu button is disabled for the eraser tool', async ({ isMobile, toolbar }) => {
		test.skip(!isMobile, 'only run on mobile')
		const { eraser } = toolbar.tools
		await eraser.click()
		await expect(toolbar.mobileStylesButton).toBeDisabled()
	})
})
