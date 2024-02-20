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
		const { blue, black } = stylePanel.colors
		const { pattern, none } = stylePanel.fill
		if (isMobile) {
			await toolbar.mobileStylesButton.click()
		}
		// these are hinted by default
		await stylePanel.isHinted(black)
		await stylePanel.isHinted(none)
		// these are not hinted by default
		await stylePanel.isNotHinted(pattern)
		await stylePanel.isNotHinted(blue)

		await blue.click()
		await stylePanel.isHinted(blue)
		await stylePanel.isNotHinted(black)

		await pattern.click()
		await stylePanel.isHinted(pattern)
		await stylePanel.isNotHinted(none)
		// this should not change the hint state of color buttons
		await stylePanel.isHinted(blue)
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
