import { expect } from '@playwright/test'
import { setup } from '../shared-e2e'
import test from './fixtures/fixtures'

test.describe('minimap', () => {
	test.beforeEach(setup)

	test('you can open and close the zoom menu', async ({ minimap, isMobile }) => {
		// no minimap on mobile
		test.skip(isMobile)
		const { button } = minimap
		const { zoomIn } = minimap.items
		await expect(zoomIn).toBeHidden()
		await button.click()
		await expect(zoomIn).toBeVisible()
		await button.click()
		await expect(zoomIn).toBeHidden()
	})

	// ...
	// More tests here
	// ...
})
