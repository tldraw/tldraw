import test, { expect } from '@playwright/test'
import { App } from '@tldraw/tldraw'

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

declare const app: App

test.describe('keyboard shortcuts', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('http://localhost:5420/')
		await page.waitForSelector('.tl-canvas')
		await page.evaluate(() => {
			app.enableAnimations = false
		})
	})

	test('tools', async ({ page }) => {
		const geoToolKds = [
			['r', 'rectangle'],
			['o', 'ellipse'],
		]

		for (const [key, geo] of geoToolKds) {
			await page.keyboard.press('v') // set back to select
			await page.keyboard.press(key)
			expect(await page.evaluate(() => app.currentToolId), `${key} -> ${geo}`).toBe('geo')
			expect(await page.evaluate(() => app.props!.geo), `${key} -> ${geo}`).toBe(geo)
		}
		const otherToolKbds = [
			['d', 'draw'],
			['x', 'draw'],
			['v', 'select'],
			['h', 'hand'],
			['a', 'arrow'],
			['l', 'line'],
			['f', 'frame'],
			['n', 'note'],
			['f', 'frame'],
			['e', 'eraser'],
			['k', 'laser'],
			['t', 'text'],
		]

		for (const [key, tool] of otherToolKbds) {
			await page.keyboard.press('v') // set back to select
			await page.keyboard.press(key)
			expect(await page.evaluate(() => app.currentToolId), `${key} -> ${tool}`).toBe(tool)
		}
	})

	test('camera', async ({ page }) => {
		// when on a mobile device...
		const hasMobileMenu = await page.isVisible('.tlui-toolbar__styles__button')

		// todo, add skip animations option to app
		expect(await page.evaluate(() => app.zoomLevel)).toBe(1)
		await page.keyboard.press('Control+=')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(2)
		await page.keyboard.press('Control+=')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(4)
		await page.keyboard.press('Control+=')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(8)
		await page.keyboard.press('Control+=')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(8)
		await page.keyboard.press('Control+-')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(4)
		await page.keyboard.press('Control+-')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(2)
		await page.keyboard.press('Control+-')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(1)
		await page.keyboard.press('Control+-')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(0.5)
		await page.keyboard.press('Control+-')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(0.25)
		await page.keyboard.press('Control+-')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(0.1)
		await page.keyboard.press('Control+-')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(0.1)
		await page.keyboard.press('Shift+0')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(1)

		// Zoom to fit (noop since the camera is empty)
		await page.keyboard.press('Shift+1')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(1)

		// Create a shape
		await page.keyboard.press('r')
		await page.mouse.move(100, 100)
		await page.mouse.down()
		await page.mouse.up()

		await page.keyboard.press('Shift+1')

		expect(await page.evaluate(() => app.zoomLevel)).toBeGreaterThan(1)

		// zoom out to .5
		await page.keyboard.press('Shift+0')
		await page.keyboard.press('Control+-')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(0.5)

		await page.getByTestId('main.menu').click()
		await page.getByTestId('menu-item.edit').click()
		await page.getByTestId('menu-item.select-none').click()

		expect(await page.evaluate(() => app.selectedIds.length)).toBe(0)

		// zoom to selection (noop, the camera is empty)
		await page.keyboard.press('Shift+2')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(0.5)

		// select all
		await page.keyboard.press('Control+a')

		await page.keyboard.press('Shift+2')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(1)

		// zoom in
		await page.keyboard.press('Control+=')
		await page.keyboard.press('Control+=')
		expect(await page.evaluate(() => app.zoomLevel)).toBe(4)

		// Now zoom to selection again (zooms to fill the screen)
		await page.keyboard.press('Shift+2')

		if (hasMobileMenu) {
			// should zoom out to fit the shape
			expect(await page.evaluate(() => app.zoomLevel)).toBeLessThan(2)
		} else {
			// should zoom in to fit the shape
			expect(await page.evaluate(() => app.zoomLevel)).toBeGreaterThan(2)
		}
	})

	test('grid mode', async ({ page }) => {
		expect(await page.evaluate(() => app.isGridMode)).toBe(false)
		await page.keyboard.press("Control+'")
		expect(await page.evaluate(() => app.isGridMode)).toBe(true)
		await page.keyboard.press("Control+'")
		expect(await page.evaluate(() => app.isGridMode)).toBe(false)
	})

	test('dark mode', async ({ page }) => {
		expect(await page.evaluate(() => app.isDarkMode)).toBe(false)
		await page.keyboard.press('Control+/')
		expect(await page.evaluate(() => app.isDarkMode)).toBe(true)
		await page.keyboard.press('Control+/')
		expect(await page.evaluate(() => app.isDarkMode)).toBe(false)
	})

	test('focus mode', async ({ page }) => {
		expect(await page.evaluate(() => app.isFocusMode)).toBe(false)
		await page.keyboard.press('Control+.')
		expect(await page.evaluate(() => app.isFocusMode)).toBe(true)
		await page.keyboard.press('Control+.')
		expect(await page.evaluate(() => app.isFocusMode)).toBe(false)
	})

	test('tool lock', async ({ page }) => {
		expect(await page.evaluate(() => app.isToolLocked)).toBe(false)
		await page.keyboard.press('q')
		expect(await page.evaluate(() => app.isToolLocked)).toBe(true)

		await page.keyboard.press('r')
		await page.mouse.move(100, 100)
		await page.mouse.down()
		await page.mouse.up()

		expect(await page.evaluate(() => app.currentToolId)).toBe('geo')

		await page.keyboard.press('q')
		expect(await page.evaluate(() => app.isToolLocked)).toBe(false)

		await page.keyboard.press('r')
		await page.mouse.move(100, 100)
		await page.mouse.down()
		await page.mouse.up()

		expect(await page.evaluate(() => app.currentToolId)).toBe('select')
	})

	// Transform
	test.skip('flip-h — ⇧H', async () => {
		// todo
	})

	test.skip('flip-v — ⇧V', async () => {
		// todo
	})

	test.skip('move-to-front — ]', async () => {
		// todo
	})

	test.skip('move-forward — ⌥]', async () => {
		// todo
	})

	test.skip('move-backward — ⌥[', async () => {
		// todo
	})

	test.skip('move-to-back — [', async () => {
		// todo
	})

	test.skip('group — ⌘G', async () => {
		// todo
	})

	test.skip('ungroup — ⌘⇧G', async () => {
		// todo
	})

	// File
	test.skip('new-project — ⌘N', async () => {
		// todo
	})

	test.skip('open — ⌘O', async () => {
		// todo
	})

	test.skip('save — ⌘S', async () => {
		// todo
	})

	test.skip('save-as — ⌘⇧S', async () => {
		// todo
	})

	test.skip('upload-media — ⌘I', async () => {
		// todo
	})

	// Edit
	test.skip('undo — ⌘Z', async () => {
		// todo
	})

	test.skip('redo — ⌘⇧Z', async () => {
		// todo
	})

	test.skip('cut — ⌘X', async () => {
		// todo
	})

	test.skip('copy — ⌘C', async () => {
		// todo
	})

	test.skip('paste — ⌘V', async () => {
		// todo
	})

	test.skip('select-all — ⌘A', async () => {
		// todo
	})

	test.skip('delete — ⌫', async () => {
		// todo
	})

	test.skip('duplicate — ⌘D', async () => {
		// todo
	})
})
