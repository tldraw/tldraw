import { expect, test } from '../fixtures/tla-test'

const COOKIE_CONSENT_KEY = 'tldraw_cookie_consent'

// Exercise the banner as a signed-out visitor so consent relies on localStorage.
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('cookie consent banner', () => {
	test.beforeEach(async ({ page }) => {
		// Mock the consent check to always require consent
		await page.route('https://consent.tldraw.xyz', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ requires_consent: true, country_code: 'TEST' }),
			})
		})

		await page.evaluate((key) => {
			// eslint-disable-next-line no-restricted-syntax
			window.localStorage.removeItem(key)
		}, COOKIE_CONSENT_KEY)
	})

	test('shows banner and animations work without prefers-reduced-motion', async ({
		page,
		homePage,
	}) => {
		await homePage.goto()
		await homePage.isLoaded()

		const banner = page.getByTestId('tla-cookie-consent')
		await expect(banner).toBeVisible()

		// Verify animation duration is set (not instant)
		const animationDuration = await banner.evaluate((el) => {
			const styles = window.getComputedStyle(el)
			return styles.animationDuration
		})
		expect(animationDuration).not.toBe('0s')

		await expect(banner.getByRole('button', { name: 'Opt out' })).toBeVisible()
		await expect(banner.getByRole('button', { name: 'Settings' })).toBeVisible()
		await expect(banner.getByRole('button', { name: 'Accept all' })).toBeVisible()
	})

	test.describe('with prefers-reduced-motion', () => {
		test.beforeEach(async ({ page, homePage }) => {
			await page.emulateMedia({ reducedMotion: 'reduce' })
			await homePage.goto()
			await homePage.isLoaded()
		})

		test('animations are instant', async ({ page }) => {
			const banner = page.getByTestId('tla-cookie-consent')
			await expect(banner).toBeVisible()

			// Check that animation duration is 0
			const animationDuration = await banner.evaluate((el) => {
				const styles = window.getComputedStyle(el)
				return styles.animationDuration
			})
			expect(animationDuration).toBe('0s')
		})

		test('accepting cookies hides banner and persists choice', async ({ page, homePage }) => {
			const banner = page.getByTestId('tla-cookie-consent')
			await expect(banner).toBeVisible()

			await banner.getByRole('button', { name: 'Accept all' }).click()

			await expect(banner).not.toBeVisible()

			await expect(async () => {
				const storedConsent = await page.evaluate(
					// eslint-disable-next-line no-restricted-syntax
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
					// eslint-disable-next-line no-restricted-syntax
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
})
