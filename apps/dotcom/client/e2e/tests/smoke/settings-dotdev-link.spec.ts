import { expect, test } from '../../fixtures/tla-test'

const DOT_DEV_URL =
	'https://tldraw.dev?utm_source=dotcom&utm_medium=organic&utm_campaign=sidebar-link'

test.describe('settings dot dev link', () => {
	test.beforeEach(async ({ page, homePage, editor, sidebar }) => {
		// The settings dialog is behind `ui_v3`, which is off for the test users. The app reads its
		// flags once at boot, so the override goes in before a reload.
		await page.route('**/api/app/feature-flags', async (route) => {
			const response = await route.fetch()
			const flags = await response.json()
			await route.fulfill({ response, json: { ...flags, ui_v3: { enabled: true } } })
		})
		await page.reload()
		await homePage.isLoaded()
		await editor.ensureSidebarOpen()
		await sidebar.openSettings('about')
	})

	test('is visible with expected link', async ({ page }) => {
		const link = page.getByTestId('tla-settings-dotdev-link')

		await expect(link).toBeVisible()
		await expect(link).toHaveAttribute('href', DOT_DEV_URL)
	})

	test('clicking opens tldraw.dev in a new tab', async ({ page }) => {
		const link = page.getByTestId('tla-settings-dotdev-link')

		// Verify the link would open in a new tab
		await expect(link).toHaveAttribute('target', '_blank')
	})
})
