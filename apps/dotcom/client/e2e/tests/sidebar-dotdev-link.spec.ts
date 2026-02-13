import { expect, test } from '../fixtures/tla-test'

const DOT_DEV_LOCAL_STORAGE_KEY = 'showDotDevLink'
const DOT_DEV_URL =
	'https://tldraw.dev?utm_source=dotcom&utm_medium=organic&utm_campaign=sidebar-link'

test.describe('sidebar dot dev link', () => {
	test.beforeEach(async ({ page, homePage, editor }) => {
		await editor.ensureSidebarOpen()
		await page.evaluate((key) => {
			// eslint-disable-next-line no-restricted-syntax
			window.localStorage.removeItem(key)
		}, DOT_DEV_LOCAL_STORAGE_KEY)

		await page.reload()
		await homePage.isLoaded()
		await editor.ensureSidebarOpen()
	})

	test('is visible with expected link', async ({ page }) => {
		const link = page.getByTestId('tla-sidebar-dotdev-link')
		const dismissButton = page.getByTestId('tla-sidebar-dotdev-dismiss-button')

		await expect(link).toBeVisible()
		await expect(link).toHaveAttribute('href', DOT_DEV_URL)
		await expect(dismissButton).toBeVisible()
	})

	test('clicking opens tldraw.dev in a new tab', async ({ page }) => {
		const link = page.getByTestId('tla-sidebar-dotdev-link')

		const [popup] = await Promise.all([page.waitForEvent('popup'), link.click()])
		await popup.waitForURL(/https:\/\/tldraw\.dev/, { timeout: 15000 })
		expect(popup.url()).toContain('https://tldraw.dev')
		await popup.close()
	})

	test('can be dismissed and stays hidden after reload', async ({ page, homePage, editor }) => {
		await page.getByTestId('tla-sidebar-dotdev-dismiss-button').click()

		await expect(page.getByTestId('tla-sidebar-dotdev-link')).not.toBeVisible()
		await expect(async () => {
			const storedValue = await page.evaluate(
				// eslint-disable-next-line no-restricted-syntax
				(key) => window.localStorage.getItem(key),
				DOT_DEV_LOCAL_STORAGE_KEY
			)
			expect(storedValue).toBe('false')
		}).toPass()

		await page.reload()
		await homePage.isLoaded()
		await editor.ensureSidebarOpen()
		await expect(page.getByTestId('tla-sidebar-dotdev-link')).not.toBeVisible()
	})
})
