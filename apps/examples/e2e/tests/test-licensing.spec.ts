import { expect } from '@playwright/test'
import test from '../fixtures/fixtures'

// Helper function to set up license testing
async function setupLicenseTest(page: any, licenseKey: string) {
	await page.addInitScript(`
			window.__TLDRAW_LICENSE_KEY__ = "${licenseKey}";
		`)
	await page.goto('http://localhost:5420/end-to-end')
	await page.waitForTimeout(6000) // Wait for license processing
}

test.describe('Internal license', () => {
	test('does not render editor for expired internal license', async ({ page }) => {
		const expiredInternalLicenseKey =
			'tldraw-/WyJ0ZXN0LWludGVybmFsLWV4cGlyZWQtNm1vbnRocyIsWyJsb2NhbGhvc3QiXSw1LCIyMDI1LTAzLTAyVDA5OjM5OjMxLjYzMVoiXQ==.efmj2rGm9PqHqW4HqYE420Nomdubcm693r2gr+WWaIRQoA+I5BNJ2Z2kan0SdbXKcWj4oeyNruSeo7ixtRmfbg=='

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
			msg.includes('Your tldraw license has been expired for more than 30 days!')
		)
		expect(hasExpiredMessage).toBe(true)
	})
})

test.describe('Watermarked license', () => {
	test('shows watermark with default license key', async ({ page }) => {
		// Don't set any license key - this should use our default license that shows the watermark
		await page.goto('http://localhost:5420/end-to-end')
		await page.waitForTimeout(6000)

		// The editor should render normally
		await expect(page.locator('.tl-canvas')).toBeVisible()

		// The watermark should be visible (default license has WITH_WATERMARK flag)
		await expect(page.getByTestId('tl-watermark-licensed')).toBeVisible()

		// The unlicensed watermark should NOT be visible
		await expect(page.getByTestId('tl-watermark-unlicensed')).not.toBeVisible()
	})
})

test.describe('Unlicensed', () => {
	test('shows unlicensed watermark when no license key provided', async ({ page }) => {
		const consoleMessages: string[] = []
		page.on('console', (msg) => {
			consoleMessages.push(msg.text())
		})

		// Explicitly set no license key by setting it to null
		await page.addInitScript(`
			window.__TLDRAW_LICENSE_KEY__ = null;
		`)
		await page.goto('http://localhost:5420/end-to-end')
		await page.waitForTimeout(6000)

		// In development mode (localhost), the editor should render normally with watermark
		await expect(page.locator('.tl-canvas')).toBeVisible()

		// The unlicensed watermark should be visible since we have no license
		await expect(page.getByTestId('tl-watermark-unlicensed')).toBeVisible()

		// The watermark should NOT be visible
		await expect(page.getByTestId('tl-watermark-licensed')).not.toBeVisible()

		// License gate should not be visible (editor is not blocked)
		await expect(page.getByTestId('tl-license-expired')).not.toBeVisible()

		// Debug: Check what license key is being used (should be null)
		const licenseKeyUsed = await page.evaluate(() => {
			return (window as any).__TLDRAW_LICENSE_KEY__
		})
		expect(licenseKeyUsed).toBe(null)
	})

	test('shows unlicensed watermark when license key is undefined', async ({ page }) => {
		// Explicitly set license key to undefined
		await page.addInitScript(`
			window.__TLDRAW_LICENSE_KEY__ = undefined;
		`)
		await page.goto('http://localhost:5420/end-to-end')
		await page.waitForTimeout(6000)

		// In development mode (localhost), the editor should render normally with watermark
		await expect(page.locator('.tl-canvas')).toBeVisible()

		// The unlicensed watermark should be visible since we have no license
		await expect(page.getByTestId('tl-watermark-unlicensed')).toBeVisible()

		// The watermark should NOT be visible
		await expect(page.getByTestId('tl-watermark-licensed')).not.toBeVisible()

		// License gate should not be visible (editor is not blocked)
		await expect(page.getByTestId('tl-license-expired')).not.toBeVisible()
	})

	test('shows unlicensed watermark when license key is empty string', async ({ page }) => {
		// Set license key to empty string
		await page.addInitScript(`
			window.__TLDRAW_LICENSE_KEY__ = "";
		`)
		await page.goto('http://localhost:5420/end-to-end')
		await page.waitForTimeout(6000)

		// In development mode (localhost), the editor should render normally with watermark
		await expect(page.locator('.tl-canvas')).toBeVisible()

		// The unlicensed watermark should be visible since we have no valid license
		await expect(page.getByTestId('tl-watermark-unlicensed')).toBeVisible()

		// The watermark should NOT be visible
		await expect(page.getByTestId('tl-watermark-licensed')).not.toBeVisible()

		// License gate should not be visible (editor is not blocked)
		await expect(page.getByTestId('tl-license-expired')).not.toBeVisible()
	})
})

test.describe('Expired evaluation license', () => {
	test('does not render editor for expired evaluation license', async ({ page }) => {
		const expiredEvaluationLicenseKey =
			'tldraw-/WyJ0ZXN0LWV2YWwtZXhwaXJlZC03ZGF5cyIsWyJsb2NhbGhvc3QiXSwxNiwiMjAyNS0wOC0yMlQwODoyMDoyMC43MjJaIl0=.XIuM3PlrSjs3WMX2tWzgZil/x/TNliCR/NgHtUHcr6nzk2n6S+2ijsd6w+MPP9uEyUdRdg/FQLfcYJ5pqA/G0w=='

		const consoleMessages: string[] = []
		page.on('console', (msg) => {
			consoleMessages.push(msg.text())
		})

		await setupLicenseTest(page, expiredEvaluationLicenseKey)

		await expect(page.getByTestId('tl-license-expired')).toBeAttached()

		await expect(page.locator('.tl-canvas')).not.toBeVisible()

		const hasExpiredMessage = consoleMessages.some((msg) =>
			msg.includes('Your tldraw evaluation license has expired!')
		)
		expect(hasExpiredMessage).toBe(true)
	})
})

test.describe('Expired annual/perpetual license', () => {
	test('does not render editor for expired annual license (beyond grace period)', async ({
		page,
	}) => {
		const expiredAnnualLicenseKey =
			'tldraw-/WyJ0ZXN0LWV4cGlyZWQtNzAiLFsibG9jYWxob3N0Il0sMSwiMjAyNS0wNi0yMFQwODoxODoyMS4zODRaIl0=.99Ce05q5rnBGhpTzptrTtvmYGjD4EEmWRbcrYqcVFdR1cRbcCzmHNSoGIz1wFWjpZSNQrMZ2ezj5yPALFRjVEw=='

		const consoleMessages: string[] = []
		page.on('console', (msg) => {
			consoleMessages.push(msg.text())
		})

		await setupLicenseTest(page, expiredAnnualLicenseKey)

		await expect(page.getByTestId('tl-license-expired')).toBeAttached()

		await expect(page.locator('.tl-canvas')).not.toBeVisible()

		const hasExpiredMessage = consoleMessages.some((msg) =>
			msg.includes('Your tldraw license has been expired for more than 30 days!')
		)
		expect(hasExpiredMessage).toBe(true)

		const hasAnnualMessage = consoleMessages.some((msg) =>
			msg.includes('Please reach out to sales@tldraw.com to renew your license.')
		)
		expect(hasAnnualMessage).toBe(true)
	})
})
