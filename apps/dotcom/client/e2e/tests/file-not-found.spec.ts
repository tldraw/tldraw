import { createFixtures } from '../fixtures/helpers'
import { expect, test } from '../fixtures/tla-test'

const BASE_URL = 'http://localhost:3000'

test.describe('file not found', () => {
	test('navigating to /f/<randomstring> shows not found error', async ({ page }) => {
		// Navigate to a file URL with a random slug that doesn't exist
		const randomSlug = Math.random().toString(36).substring(2, 15)
		await page.goto(`${BASE_URL}/f/${randomSlug}`)

		const { errorPage } = createFixtures(page)

		// Should show the "Not found" error
		await expect(async () => {
			await errorPage.expectNotFoundVisible()
		}).toPass()

		// Should also show the error icon
		await expect(page.getByTestId('tla-error-icon')).toBeVisible()
	})

	test('navigating to /f/<randomstring> when logged out shows not found error', async ({
		browser,
	}) => {
		// Test in an incognito context (logged out user)
		const context = await browser.newContext({ storageState: undefined })
		const page = await context.newPage()

		const randomSlug = Math.random().toString(36).substring(2, 15)
		await page.goto(`${BASE_URL}/f/${randomSlug}`)

		const { errorPage } = createFixtures(page)

		// Should show the "Not found" error
		await expect(async () => {
			await errorPage.expectNotFoundVisible()
		}).toPass()

		// Should also show the error icon
		await expect(page.getByTestId('tla-error-icon')).toBeVisible()

		await context.close()
	})
})
