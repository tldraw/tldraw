import test from '@playwright/test'

test.describe('Routes', () => {
	test('end-to-end', async ({ page }) => {
		await page.goto('http://localhost:5420/end-to-end')
		await page.waitForSelector('.tl-canvas')
	})

	test('basic', async ({ page }) => {
		await page.goto('http://localhost:5420/develop')
		await page.waitForSelector('.tl-canvas')
	})

	test('api', async ({ page }) => {
		await page.goto('http://localhost:5420/api/full')
		await page.waitForSelector('.tl-canvas')
	})

	test('hide-ui', async ({ page }) => {
		await page.goto('http://localhost:5420/custom-config/full')
		await page.waitForSelector('.tl-canvas')
	})

	test('custom-config', async ({ page }) => {
		await page.goto('http://localhost:5420/custom-config/full')
		await page.waitForSelector('.tl-canvas')
	})

	test('custom-ui', async ({ page }) => {
		await page.goto('http://localhost:5420/custom-ui/full')
		await page.waitForSelector('.tl-canvas')
	})

	test('exploded', async ({ page }) => {
		await page.goto('http://localhost:5420/exploded/full')
		await page.waitForSelector('.tl-canvas')
	})

	test('scroll', async ({ page }) => {
		await page.goto('http://localhost:5420/scroll/full')
		await page.waitForSelector('.tl-canvas')
	})

	test('multiple', async ({ page }) => {
		await page.goto('http://localhost:5420/multiple/full')
		await page.waitForSelector('.tl-canvas')
	})

	test('error-boundary', async ({ page }) => {
		await page.goto('http://localhost:5420/error-boundary/full')
		await page.waitForSelector('.tl-canvas')
	})

	test('user-presence', async ({ page }) => {
		await page.goto('http://localhost:5420/user-presence/full')
		await page.waitForSelector('.tl-canvas')
	})

	test('ui-events', async ({ page }) => {
		await page.goto('http://localhost:5420/ui-events/full')
		await page.waitForSelector('.tl-canvas')
	})

	test('store-events', async ({ page }) => {
		await page.goto('http://localhost:5420/store-events/full')
		await page.waitForSelector('.tl-canvas')
	})

	test('persistence', async ({ page }) => {
		await page.goto('http://localhost:5420/local-storage/full')
		await page.waitForSelector('.tl-canvas')
	})

	test('snapshots', async ({ page }) => {
		await page.goto('http://localhost:5420/snapshots/full')
		await page.waitForSelector('.tl-canvas')
	})
})
