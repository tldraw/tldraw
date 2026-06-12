import { expect, test } from '@playwright/test'

// Smoke test: every table example loads, and the seeded ones render their table.
// Catches broken routes (wrong example folder/category) and import/render errors.

const SEEDED = [
	'table',
	'table-controls',
	'table-formulas',
	'table-merge',
	'table-vlookup',
	'table-csv',
]

test.describe('table examples smoke', () => {
	for (const slug of SEEDED) {
		test(`/${slug} loads`, async ({ page }) => {
			await page.goto(`http://localhost:5420/${slug}/full`)
			await expect(page.locator('.tl-container')).toBeVisible({ timeout: 20000 })
		})
	}

	for (const slug of SEEDED) {
		test(`/${slug} renders a seeded table`, async ({ page }) => {
			await page.goto(`http://localhost:5420/${slug}/full`)
			await expect(page.locator('.tl-shape').first()).toBeVisible({ timeout: 20000 })
		})
	}
})
