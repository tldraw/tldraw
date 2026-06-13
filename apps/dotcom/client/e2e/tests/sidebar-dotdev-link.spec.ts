import { expect, test } from '../fixtures/tla-test'

const DOT_DEV_LOCAL_STORAGE_KEY = 'showDotDevLink'
const DOT_DEV_URL =
	'https://tldraw.dev?utm_source=dotcom&utm_medium=organic&utm_campaign=sidebar-link'

test.describe('sidebar dot dev link', () => {
	test.beforeEach(async ({ page, homePage, editor }) => {
		await editor.ensureSidebarOpen()
		await page.evaluate((key) => {
			// eslint-disable-next-line tldraw/no-direct-storage
			window.localStorage.removeItem(key)
		}, DOT_DEV_LOCAL_STORAGE_KEY)

		await page.reload()
		await homePage.isLoaded()
		await editor.ensureSidebarOpen()
	})

	test('is visible with expected link', async ({ page }) => {
		const link = page.getByTestId('tla-sidebar-dotdev-link')

		await expect(link).toBeVisible()
		await expect(link).toHaveAttribute('href', DOT_DEV_URL)
	})

	test('clicking opens tldraw.dev in a new tab', async ({ page }) => {
		const link = page.getByTestId('tla-sidebar-dotdev-link')

		// Verify the link would open in a new tab
		await expect(link).toHaveAttribute('target', '_blank')
	})
})
