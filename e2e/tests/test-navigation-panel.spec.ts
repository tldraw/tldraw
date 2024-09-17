import { expect } from '@playwright/test'
import { setup } from '../shared-e2e'
import test from './fixtures/fixtures'

test.describe('navigationPanel', () => {
	test.beforeEach(setup)

	test('you can open and close the zoom menu', async ({ navigationPanel, isMobile }) => {
		// no navigationPanel on mobile
		test.skip(isMobile)
		const { zoomMenuButton } = navigationPanel
		const { zoomIn } = navigationPanel.zoomMenuItems
		await expect(zoomIn).toBeHidden()
		await zoomMenuButton.click()
		await expect(zoomIn).toBeVisible()
		await zoomMenuButton.click()
		await expect(zoomIn).toBeHidden()
	})
	test('you can toggle the minimap', async ({ navigationPanel, isMobile }) => {
		// no navigationPanel on mobile
		test.skip(isMobile)
		const { minimap, toggleButton } = navigationPanel
		await expect(minimap).toBeHidden()
		await toggleButton.click()
		await expect(minimap).toBeVisible()
		await toggleButton.click()
		await expect(minimap).toBeHidden()
	})

	// ...
	// More tests here
	// ...
})
