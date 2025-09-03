import { expect } from '@playwright/test'
import test from './fixtures/fixtures'

// Helper function to set up license testing
async function setupLicenseTest(page: any, licenseKey: string) {
	await page.addInitScript(`
			window.__TLDRAW_LICENSE_KEY__ = "${licenseKey}";
		`)
	await page.goto('http://localhost:5420/end-to-end')
	await page.waitForTimeout(2000) // Wait for license processing
}

test.describe('Internal License', () => {
	test('does not render editor for expired internal license', async ({ page }) => {
		const expiredInternalLicenseKey =
			'tldraw-/WyJ0ZXN0LWludGVybmFsLWV4cGlyZWQiLFsibG9jYWxob3N0Il0sNSwiMjAyNS0wOC0xOFQxMDozOTozOC4xMzRaIl0=.oKdLpnwcnSxmI76ZLowRg6chGUWEyeGYLRbIU1pqtVPS4hmfxSzsCtgvVHxgOslNxz9FkN58Quo7npxhIs7LMA=='

		const consoleMessages: string[] = []
		page.on('console', (msg) => {
			consoleMessages.push(msg.text())
		})

		await setupLicenseTest(page, expiredInternalLicenseKey)

		await expect(page.getByTestId('tl-license-expired')).toBeAttached()

		// The actual editor canvas should not be rendered
		await expect(page.locator('.tl-canvas')).not.toBeVisible()

		// Check that console contains license expiry message
		const hasExpiredMessage = consoleMessages.some((msg) =>
			msg.includes('Your tldraw license has expired!')
		)
		expect(hasExpiredMessage).toBe(true)
	})
})

test.describe('License with watermark', () => {
	test('shows the watermark', async ({ page }) => {
		// Don't set any license key - this should use our default license that shows the watermark
		await page.goto('http://localhost:5420/end-to-end')
		await page.waitForTimeout(2000)

		// The editor should render normally
		await expect(page.locator('.tl-canvas')).toBeVisible()

		// The watermark should be visible
		await expect(page.locator('.tl-watermark_SEE-LICENSE')).toBeVisible()
	})
})
