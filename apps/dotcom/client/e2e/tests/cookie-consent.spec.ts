import { expect, test } from '../fixtures/tla-test'

const COOKIE_CONSENT_KEY = 'tldraw_cookie_consent'

// Exercise the banner as a signed-out visitor so consent relies on localStorage.
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('cookie consent banner', () => {
	test.beforeEach(async ({ page, homePage }) => {
		await page.evaluate((key) => {
			window.localStorage.removeItem(key)
		}, COOKIE_CONSENT_KEY)
		await homePage.goto()
		await homePage.isLoaded()
	})

	test('shows banner when consent is unset', async ({ page }) => {
		const banner = page.getByTestId('tla-cookie-consent')
		await expect(banner).toBeVisible()
		await expect(banner.getByRole('button', { name: 'Opt out' })).toBeVisible()
		await expect(banner.getByRole('button', { name: 'Settings' })).toBeVisible()
		await expect(banner.getByRole('button', { name: 'Accept all' })).toBeVisible()
	})

	test('accepting cookies hides banner and persists choice', async ({ page, homePage }) => {
		const banner = page.getByTestId('tla-cookie-consent')
		await expect(banner).toBeVisible()

		await banner.getByRole('button', { name: 'Accept all' }).click()

		await expect(banner).not.toBeVisible()

		await expect(async () => {
			const storedConsent = await page.evaluate(
				(key) => window.localStorage.getItem(key),
				COOKIE_CONSENT_KEY
			)
			expect(storedConsent).toBe(JSON.stringify({ analytics: true }))
		}).toPass()

		await page.reload()
		await homePage.isLoaded()
		await expect(page.getByTestId('tla-cookie-consent')).not.toBeVisible()
	})

	test('opting out hides banner and persists choice', async ({ page, homePage }) => {
		const banner = page.getByTestId('tla-cookie-consent')
		await expect(banner).toBeVisible()

		await banner.getByRole('button', { name: 'Opt out' }).click()

		await expect(banner).not.toBeVisible()

		await expect(async () => {
			const storedConsent = await page.evaluate(
				(key) => window.localStorage.getItem(key),
				COOKIE_CONSENT_KEY
			)
			expect(storedConsent).toBe(JSON.stringify({ analytics: false }))
		}).toPass()

		await page.reload()
		await homePage.isLoaded()
		await expect(page.getByTestId('tla-cookie-consent')).not.toBeVisible()
	})
})
