import { expect, test } from '@playwright/test'

// Smoke test: every table example loads, and the seeded ones render their table.
// Catches broken routes (wrong example folder/category) and import/render errors.

const SEEDED = [
	'table',
	'table-structure',
	'table-styling',
	'table-affordances',
	'table-custom-cells',
	'table-formulas',
	'table-references',
	'table-vlookup',
	'table-csv',
	'table-project-tracker',
]
const TOOL_ONLY = ['table-multiplayer'] // no seed — just loads the editor + tool

test.describe('table examples smoke', () => {
	for (const slug of [...SEEDED, ...TOOL_ONLY]) {
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
