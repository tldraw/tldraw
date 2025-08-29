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
			'tldraw-/WyJ0ZXN0LWludGVybmFsLWV4cGlyZWQtNm1vbnRocyIsWyJsb2NhbGhvc3QiXSw1LCIyMDI1LTAzLTAyVDA5OjM5OjMxLjYzMVoiXQ==.efmj2rGm9PqHqW4HqYE420Nomdubcm693r2gr+WWaIRQoA+I5BNJ2Z2kan0SdbXKcWj4oeyNruSeo7ixtRmfbg=='

		const consoleMessages: string[] = []
		page.on('console', (msg) => {
			consoleMessages.push(msg.text())
		})

		await setupLicenseTest(page, expiredInternalLicenseKey)

		await expect(page.getByTestId('tl-license-expired')).toBeAttached({ timeout: 10000 })

		// The actual editor canvas should not be rendered
		await expect(page.locator('.tl-canvas')).not.toBeVisible()

		// Check that console contains internal license expiry message
		const hasExpiredMessage = consoleMessages.some((msg) =>
			msg.includes('Your internal tldraw license has expired.')
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

test.describe('Expired Evaluation License', () => {
	test('does not render editor for expired evaluation license', async ({ page }) => {
		// Generated using generate-test-licenses.ts - expired evaluation license
		const expiredEvaluationLicenseKey =
			'tldraw-/WyJ0ZXN0LWV2YWwtZXhwaXJlZC03ZGF5cyIsWyJsb2NhbGhvc3QiXSwxNiwiMjAyNS0wOC0yMlQwODoyMDoyMC43MjJaIl0=.XIuM3PlrSjs3WMX2tWzgZil/x/TNliCR/NgHtUHcr6nzk2n6S+2ijsd6w+MPP9uEyUdRdg/FQLfcYJ5pqA/G0w=='

		const consoleMessages: string[] = []
		page.on('console', (msg) => {
			consoleMessages.push(msg.text())
		})

		await setupLicenseTest(page, expiredEvaluationLicenseKey)

		// Should show the expired license screen
		await expect(page.getByTestId('tl-license-expired')).toBeAttached({ timeout: 10000 })

		// The actual editor canvas should not be rendered
		await expect(page.locator('.tl-canvas')).not.toBeVisible()

		// Check that console contains evaluation license expiry message
		const hasExpiredMessage = consoleMessages.some((msg) =>
			msg.includes('Your tldraw evaluation license has expired!')
		)
		expect(hasExpiredMessage).toBe(true)

		// Check for evaluation-specific message
		const hasEvaluationMessage = consoleMessages.some((msg) =>
			msg.includes('Evaluation licenses expire immediately without a grace period.')
		)
		expect(hasEvaluationMessage).toBe(true)
	})
})

test.describe('Expired Annual/Perpetual License', () => {
	test('does not render editor for expired annual license (beyond grace period)', async ({
		page,
	}) => {
		// Generated using generate-test-licenses.ts - annual license expired 70 days ago
		const expiredAnnualLicenseKey =
			'tldraw-/WyJ0ZXN0LWV4cGlyZWQtNzAiLFsibG9jYWxob3N0Il0sMSwiMjAyNS0wNi0yMFQwODoxODoyMS4zODRaIl0=.99Ce05q5rnBGhpTzptrTtvmYGjD4EEmWRbcrYqcVFdR1cRbcCzmHNSoGIz1wFWjpZSNQrMZ2ezj5yPALFRjVEw=='

		const consoleMessages: string[] = []
		page.on('console', (msg) => {
			consoleMessages.push(msg.text())
		})

		await setupLicenseTest(page, expiredAnnualLicenseKey)

		// Should show the expired license screen
		await expect(page.getByTestId('tl-license-expired')).toBeAttached({ timeout: 10000 })

		// The actual editor canvas should not be rendered
		await expect(page.locator('.tl-canvas')).not.toBeVisible()

		// Check that console contains annual license expiry message
		const hasExpiredMessage = consoleMessages.some((msg) =>
			msg.includes('Your tldraw license has been expired for more than 60 days!')
		)
		expect(hasExpiredMessage).toBe(true)

		// Check for annual/perpetual-specific message
		const hasAnnualMessage = consoleMessages.some((msg) =>
			msg.includes('Please reach out to sales@tldraw.com to renew your license.')
		)
		expect(hasAnnualMessage).toBe(true)
	})
})
