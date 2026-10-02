import { expect } from '@playwright/test'
import { Editor } from 'tldraw'
import test from '../fixtures/fixtures'
import { clickMenu, setupOrReset } from '../shared-e2e'

declare const editor: Editor

test.describe('command palette', () => {
	test.beforeEach(setupOrReset)

	test('opens with Cmd+K and runs a searched command', async ({ page }) => {
		await page.evaluate(() => {
			editor.createShapes([
				{ type: 'geo', x: 100, y: 100 },
				{ type: 'geo', x: 300, y: 250 },
			])
			editor.selectAll()
		})
		await page.keyboard.press('ControlOrMeta+k')
		const input = page.getByTestId('command-palette.input')
		await expect(input).toBeFocused()
		await input.fill('align left')
		await page.keyboard.press('Enter')
		await expect(page.getByTestId('command-palette')).toBeHidden()
		const xs = await page.evaluate(() =>
			editor.getSelectedShapes().map((shape) => editor.getShapePageBounds(shape)!.minX)
		)
		expect(xs[0]).toBeCloseTo(xs[1])
	})

	test('copies as PNG inside the keypress', async ({ page, context, browserName }) => {
		test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium only')
		await context.grantPermissions(['clipboard-read', 'clipboard-write'])
		await page.evaluate(() => {
			editor.createShapes([{ type: 'geo', x: 100, y: 100 }])
			editor.selectAll()
		})
		await page.keyboard.press('ControlOrMeta+k')
		await page.getByTestId('command-palette.input').fill('copy as png')
		await page.keyboard.press('Enter')
		await expect
			.poll(() =>
				page.evaluate(async () => {
					const items = await navigator.clipboard.read()
					return items.flatMap((item) => item.types)
				})
			)
			.toContain('image/png')
	})

	test('keeps the input focused when opened from the main menu', async ({ page }) => {
		await clickMenu(page, 'main-menu.open-command-palette')
		const input = page.getByTestId('command-palette.input')
		await expect(input).toBeFocused()
		await page.keyboard.type('zoom in')
		await expect(input).toHaveValue('zoom in')
		await expect(input).toBeFocused()
	})

	test('shows every item in a short scrolling list', async ({ page }) => {
		await page.keyboard.press('ControlOrMeta+k')
		const list = page.getByRole('listbox')
		await expect(list).toBeVisible()
		expect(await page.getByRole('option').count()).toBeGreaterThan(6)
		const height = await list.evaluate((el) => el.clientHeight)
		expect(height).toBeLessThanOrEqual(270)
	})

	test('fades the list while more items are below', async ({ page }) => {
		await page.keyboard.press('ControlOrMeta+k')
		const input = page.getByTestId('command-palette.input')
		await input.fill('a')
		const list = page.getByRole('listbox')
		await expect(list).toHaveAttribute('data-more', '')
		await list.evaluate((el) => el.scrollTo(0, el.scrollHeight))
		await expect(list).not.toHaveAttribute('data-more')
	})
})
