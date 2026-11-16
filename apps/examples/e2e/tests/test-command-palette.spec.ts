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

	test('stays open for canvas clicks with a selection, closes otherwise, and lets the camera move', async ({
		page,
		isMobile,
	}) => {
		await page.evaluate(() => {
			editor.createShapes([{ type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])
			editor.selectAll()
		})
		await page.keyboard.press('ControlOrMeta+k')
		const palette = page.getByTestId('command-palette')
		const input = page.getByTestId('command-palette.input')
		await expect(input).toBeFocused()
		// The palette sits above the toolbar on desktop and at the top on touch devices, and a phone
		// is narrow, so place the shape and the empty point in the canvas the palette and the UI
		// leave visible: whichever band above or below the palette is taller.
		const paletteBox = (await palette.boundingBox())!
		const topUi = (await page.getByTestId('main-menu.button').boundingBox())!
		const bottomUi = (await page.locator('.tlui-layout__bottom').boundingBox())!
		const above = { top: topUi.y + topUi.height, bottom: paletteBox.y }
		const below = { top: paletteBox.y + paletteBox.height, bottom: bottomUi.y }
		const band = above.bottom - above.top > below.bottom - below.top ? above : below
		expect(band.bottom - band.top).toBeGreaterThan(140)
		const y = (band.top + band.bottom) / 2
		const viewportWidth = page.viewportSize()!.width
		const shapeScreen = { x: viewportWidth / 4, y }
		const emptyPoint = { x: (viewportWidth * 3) / 4, y }
		await page.evaluate((center) => {
			const { x, y } = editor.screenToPage(center)
			const [shape] = editor.getSelectedShapes()
			editor.updateShape({ id: shape.id, type: 'geo', x: x - 50, y: y - 50 })
		}, shapeScreen)
		await expect(palette).toBeVisible()
		// A mouse click would switch a touch device to a fine pointer, which moves the palette.
		const click = (point: { x: number; y: number }) =>
			isMobile ? page.touchscreen.tap(point.x, point.y) : page.mouse.click(point.x, point.y)
		// Clicking a selected shape would start editing its label, which keeps focus.
		await click(emptyPoint)
		await expect(palette).toBeVisible()
		await expect(input).toBeFocused()
		const before = await page.evaluate(() => editor.getCamera().y)
		// Touch devices pan with a drag, not a wheel.
		if (!isMobile) {
			await page.mouse.move(emptyPoint.x, emptyPoint.y)
			await page.mouse.wheel(0, 100)
			await expect.poll(() => page.evaluate(() => editor.getCamera().y)).not.toBe(before)
			await expect(palette).toBeVisible()
			await page.mouse.wheel(0, -100)
			await expect.poll(() => page.evaluate(() => editor.getCamera().y)).toBeCloseTo(before)
		}
		// That click on empty canvas cleared the selection, so the next canvas click closes it.
		await click(shapeScreen)
		await expect(palette).toBeHidden()
		// The click still selected the shape under it.
		expect(await page.evaluate(() => editor.getSelectedShapeIds().length)).toBe(1)
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

	test('shows every item in a short scrolling list, faded while more are below', async ({
		page,
	}) => {
		await page.keyboard.press('ControlOrMeta+k')
		const list = page.getByRole('listbox')
		await expect(list).toBeVisible()
		expect(await page.getByRole('option').count()).toBeGreaterThan(6)
		// 8 rows' worth (36px each, +4): group headings take some of the space.
		const height = await list.evaluate((el) => el.clientHeight)
		expect(height).toBeLessThanOrEqual(8 * 36 + 4)
		await expect(list).toHaveAttribute('data-more', '')
		await list.evaluate((el) => el.scrollTo(0, el.scrollHeight))
		await expect(list).not.toHaveAttribute('data-more')
	})
})
